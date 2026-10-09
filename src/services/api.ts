// api.ts — perubahan: tambah cooldown mechanism dan device fingerprint
import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { useAppStatusStore } from '../stores/appStatusStore';
import { getDeviceFingerprint } from '../lib/storage/deviceFingerprint';
import { saveTarget } from '../lib/auth/postLoginTarget';

const typedImportMeta = import.meta as unknown as {
  env?: { VITE_API_BASE_URL?: string };
};
const apiBaseUrl = typedImportMeta.env?.VITE_API_BASE_URL || '/api';

const API_TIMEOUT_MS = 20_000;
const TRANSIENT_RETRY_DEFAULT_MS = 800;

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
});

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const parts = document.cookie.split(';').map((v) => v.trim());
  const hit = parts.find((v) => v.startsWith(`${name}=`));
  if (!hit) return undefined;
  return decodeURIComponent(hit.slice(name.length + 1));
}

function shouldLogoutFromRefresh(status?: number): boolean {
  return status === 401 || status === 403;
}

let maintenanceTimer: ReturnType<typeof setTimeout> | null = null;
const MAINTENANCE_OVERLAY_DELAY_MS = 5000;

function clearPendingMaintenance() {
  if (maintenanceTimer) {
    clearTimeout(maintenanceTimer);
    maintenanceTimer = null;
  }
}

function scheduleMaintenance(reason: string) {
  if (maintenanceTimer) return;
  maintenanceTimer = setTimeout(() => {
    maintenanceTimer = null;
    useAppStatusStore.getState().setMaintenance(reason);
  }, MAINTENANCE_OVERLAY_DELAY_MS);
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e: unknown) => void }> = [];

// ─── BARU: Cooldown setelah refresh berhasil ────────────────────────────────
// Mencegah rapid re-trigger saat beberapa 401 tiba hampir bersamaan
// (misalnya: request yang terlanjur dikirim sebelum cookie baru di-set)
let lastSuccessfulRefreshAt = 0;
const REFRESH_COOLDOWN_MS = 10_000; // 10 detik
// ────────────────────────────────────────────────────────────────────────────

// ─── BARU: Rate-limit guard global (HTTP 429) ───────────────────────────────
// Setelah menerima 429, guard ini memblokir SEMUA panggilan verifySession
// selama retryMs (clamp 5 detik s.d. 15 menit) agar frontend tidak membanjiri
// backend dengan request retry yang tidak berguna.
let rateLimitedUntilMs = 0;

export function getRateLimitedUntilMs(): number {
  return rateLimitedUntilMs;
}
export function clearRateLimitCooldown(): void {
  rateLimitedUntilMs = 0;
}
let rateLimitReloadTimer: ReturnType<typeof setTimeout> | null = null;
// ────────────────────────────────────────────────────────────────────────────

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

export const verifySession = async () => {
  const now = Date.now();

  // Guard 0: Jika sedang rate-limited oleh server (HTTP 429), skip permintaan.
  // Tunggu sampai cooldown habis atau reload timer dari interceptor 429 yang aktif.
  if (rateLimitedUntilMs > now) {
    const remainingSec = Math.ceil((rateLimitedUntilMs - now) / 1000);
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_CAM') === '1') {
        console.info(`[api:verifySession] skip: rate-limited sisa ${remainingSec}s`);
      }
    } catch {
      /* noop */
    }
    return;
  }
  // Guard 1: Jika sedang refresh, antre — jangan kirim request kedua ke backend
  if (isRefreshing) {
    return new Promise(function (resolve, reject) {
      failedQueue.push({ resolve, reject });
    });
  }

  // Guard 2: Jika baru saja refresh berhasil, skip
  // Cookie sudah berisi token baru; retry dari interceptor akan langsung berhasil
  // tanpa perlu menyentuh /auth/refresh lagi
  if (now - lastSuccessfulRefreshAt < REFRESH_COOLDOWN_MS) {
    return;
  }

  isRefreshing = true;
  try {
    const device_fingerprint = await getDeviceFingerprint();
    const res = await api.post('/auth/refresh', { device_fingerprint });
    lastSuccessfulRefreshAt = Date.now(); // ← catat waktu berhasil
    processQueue(null);

    // Grace path: access cookie refreshed; refresh cookie left untouched so a
    // newer token from another tab is not overwritten. Toast once per tab —
    // do NOT auto-reload (that caused a grace→reload loop).
    if (res?.data?.data?.stale_tab === true) {
      const toastKey = 'absenyura:stale-tab-toast';
      try {
        if (!sessionStorage.getItem(toastKey)) {
          sessionStorage.setItem(toastKey, '1');
          toast.info(
            'Tab ini sempat tidak sinkron. Jika ada masalah, refresh halaman secara manual.'
          );
        }
      } catch {
        toast.info(
          'Tab ini sempat tidak sinkron. Jika ada masalah, refresh halaman secara manual.'
        );
      }
    }

    return res;
  } catch (refreshError) {
    processQueue(refreshError);
    const refreshStatus = (refreshError as { response?: { status?: number } })?.response?.status;
    if (shouldLogoutFromRefresh(refreshStatus)) {
      saveTarget(window.location.pathname + window.location.search + window.location.hash);
      useAuthStore.getState().logout();
      toast.info('Sesi Anda habis. Silakan login kembali.');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
};

api.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

  if (!isSafe) {
    const token = getCookie('csrfToken');
    if (token) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const headers = config.headers ?? {};
      if (typeof headers.set === 'function') {
        headers.set('X-CSRF-Token', token);
        config.headers = headers;
      } else {
        headers['X-CSRF-Token'] = token;
        config.headers = headers;
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    clearPendingMaintenance();
    useAppStatusStore.getState().clearNetworkIssues();
    return response;
  },
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & {
          _transientRetry?: boolean;
          _csrfRetry?: boolean;
          _retry?: boolean;
        })
      | undefined;

    const url = String(originalRequest?.url || '');
    let pathname = url;
    try {
      pathname = new URL(url, window.location.origin).pathname;
    } catch {
      pathname = url;
    }

    const isPublicSiteRequest = pathname.includes('/public-site/');
    const isAdminPublicSiteRequest = pathname.includes('/public-site/admin');
    const isPublicRequest = isPublicSiteRequest && !isAdminPublicSiteRequest;
    const method = String(originalRequest?.method || 'get').toUpperCase();
    const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
    const status = error.response?.status as number | undefined;
    const errCode = String((error as { code?: string })?.code || '');
    const isTransientNetwork =
      !error?.response &&
      (errCode === 'ECONNABORTED' ||
        errCode === 'ERR_NETWORK' ||
        errCode === 'ETIMEDOUT' ||
        /timeout/i.test(String(error?.message || '')));
    const isTransientHttp = status === 502 || status === 503 || status === 504;

    // One automatic retry for safe methods on pooler blips / gateway 5xx.
    if (
      originalRequest &&
      isIdempotent &&
      (isTransientHttp || isTransientNetwork) &&
      !originalRequest._transientRetry &&
      !pathname.endsWith('/status') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._transientRetry = true;
      const retryAfterRaw = error.response?.data?.retry_after_ms;
      const retryHeaderSeconds = Number(error.response?.headers?.['retry-after']);
      const retryAfter =
        typeof retryAfterRaw === 'number' && retryAfterRaw > 0
          ? retryAfterRaw
          : Number.isFinite(retryHeaderSeconds) && retryHeaderSeconds > 0
            ? retryHeaderSeconds * 1000
            : TRANSIENT_RETRY_DEFAULT_MS;
      // Spread recovery traffic across browsers instead of retrying in lockstep.
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 900_000) + Math.random() * 1000));
      return api.request(originalRequest);
    }

    if (error?.response) {
      clearPendingMaintenance();
      useAppStatusStore.getState().clearNetworkIssues();
    }

    if (!error?.response) {
      clearPendingMaintenance();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        useAppStatusStore.getState().setOffline(true);
      } else {
        if (pathname !== '/status' && !isPublicRequest) {
          scheduleMaintenance('Menghubungkan ke server...');
        }
      }
    }
    const { isAuthenticated } = useAuthStore.getState();

    if (error.response?.status === 429) {
      // JANGAN trigger aggressive banner/reload untuk MUTASI EXPLICIT user (attendance, excuses, settings).
      // Untuk endpoint ini, biarkan caller (button handler / page) mengelola error sendiri —
      // jadinya tidak muncul "loading aneh" / banner maintenance yang menutupi UI kirim ulang.
      const pathL = pathname.toLowerCase();
      const isExplicitMutation =
        method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
      const isUserFlow =
        pathL.startsWith('/attendance/') ||
        pathL.startsWith('/excuses') ||
        pathL.startsWith('/settings') ||
        pathL.startsWith('/uploads/');
      const bypassAggressiveHandler = isExplicitMutation && isUserFlow;

      // Tangkap Retry-After (detik) atau X-RateLimit-Reset (unix ms) dari server.
      // Hitung retryMs, clamp ke 5 sd 900 detik (15 menit) agar tidak terlalu pendek/panjang.
      const headersRaw = (error.response?.headers ?? {}) as Record<
        string,
        string | number | undefined
      >;
      const headerRetryAfter =
        headersRaw['retry-after'] !== undefined
          ? String(headersRaw['retry-after'])
          : headersRaw['Retry-After'] !== undefined
            ? String(headersRaw['Retry-After'])
            : undefined;
      const headerRateLimitRetryMs =
        headersRaw['x-ratelimit-retryms'] !== undefined
          ? String(headersRaw['x-ratelimit-retryms'])
          : headersRaw['X-RateLimit-RetryMs'] !== undefined
            ? String(headersRaw['X-RateLimit-RetryMs'])
            : undefined;
      const headerRateLimitReset =
        headersRaw['ratelimit-reset'] !== undefined
          ? String(headersRaw['ratelimit-reset'])
          : headersRaw['RateLimit-Reset'] !== undefined
            ? String(headersRaw['RateLimit-Reset'])
            : undefined;
      const headerXRateLimitReset =
        headersRaw['x-ratelimit-reset'] !== undefined
          ? String(headersRaw['x-ratelimit-reset'])
          : headersRaw['X-RateLimit-Reset'] !== undefined
            ? String(headersRaw['X-RateLimit-Reset'])
            : undefined;

      let retryMs = bypassAggressiveHandler ? 15_000 : 60_000;
      if (headerRateLimitRetryMs !== undefined) {
        const n = parseInt(headerRateLimitRetryMs, 10);
        if (!Number.isNaN(n) && n > 0) retryMs = n;
      } else if (headerRateLimitReset !== undefined) {
        // RFC IETF draft-polli-ratelimit-headers: nilai = detik tersisa dalam window
        const n = parseInt(headerRateLimitReset, 10);
        if (!Number.isNaN(n) && n > 0) retryMs = n * 1000;
      } else if (headerXRateLimitReset !== undefined) {
        const n = parseInt(headerXRateLimitReset, 10);
        if (!Number.isNaN(n) && n > 0) {
          if (n > 1e10) {
            retryMs = n - Date.now();
          } else if (n > 1e9) {
            retryMs = n * 1000 - Date.now();
          } else {
            retryMs = n * 1000;
          }
        }
      } else if (headerRetryAfter !== undefined) {
        const n = parseInt(headerRetryAfter, 10);
        if (!Number.isNaN(n) && n > 0) {
          if (n > 1e10) {
            retryMs = n * 1000 - Date.now();
          } else {
            retryMs = n * 1000;
          }
        }
      }
      retryMs = Math.min(Math.max(retryMs, 5_000), 15 * 60_000);

      const now = Date.now();
      const nextLimit = now + retryMs;
      if (nextLimit > rateLimitedUntilMs) {
        rateLimitedUntilMs = nextLimit;
      }

      const remainingSec = Math.ceil((rateLimitedUntilMs - now) / 1000);
      try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_CAM') === '1') {
          console.info(
            `[api:interceptor] 429 diterima (${pathname}) rateLimitedUntilMs=${remainingSec}s explicit=${bypassAggressiveHandler}`
          );
        }
      } catch {
        /* noop */
      }

      if (!bypassAggressiveHandler) {
        scheduleMaintenance(
          `Server sedang sibuk. Tunggu ${remainingSec} detik lalu muat ulang halaman.`
        );

        if (rateLimitReloadTimer) {
          clearTimeout(rateLimitReloadTimer);
          rateLimitReloadTimer = null;
        }
        const reloadAfterMs = Math.min(retryMs + 500, 65_000);
        rateLimitReloadTimer = setTimeout(() => {
          rateLimitReloadTimer = null;
          rateLimitedUntilMs = 0;
          try {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          } catch {
            /* noop */
          }
        }, reloadAfterMs);
      }

      return Promise.reject(error);
    }

    if (error.response?.status === 403 && !originalRequest._csrfRetry) {
      const apiError = error.response?.data?.error;
      if (apiError === 'CSRF validation failed') {
        originalRequest._csrfRetry = true;
        try {
          await verifySession();
          return api.request(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    }

    if (originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && (!isAuthenticated || isPublicRequest)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await verifySession();
        return api.request(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
