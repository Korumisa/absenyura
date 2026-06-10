import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useAppStatusStore } from '../stores/appStatusStore';

const apiBaseUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
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
  }, 2000);
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

export const verifySession = async () => {
  if (isRefreshing) {
    return new Promise(function (resolve, reject) {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const res = await api.post('/auth/refresh', {});
    processQueue(null);
    return res;
  } catch (refreshError) {
    processQueue(refreshError);
    const refreshStatus = (refreshError as { response?: { status?: number } })?.response?.status;
    if (shouldLogoutFromRefresh(refreshStatus)) {
      useAuthStore.getState().logout();
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
      // @ts-ignore - Axios types are inconsistent between versions
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
    const originalRequest = error.config;

    const url = String(originalRequest?.url || '');
    let pathname = url;
    try {
      pathname = new URL(url, window.location.origin).pathname;
    } catch {
      pathname = url;
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
        if (pathname !== '/status') {
          scheduleMaintenance('Menghubungkan ke server...');
        }
      }
    }
    const isPublicSiteRequest = pathname.includes('/public-site/');
    const isAdminPublicSiteRequest = pathname.includes('/public-site/admin');
    const isPublicRequest = isPublicSiteRequest && !isAdminPublicSiteRequest;
    const { isAuthenticated } = useAuthStore.getState();

    if (error.response?.status === 429) {
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

    // Skip retry logic if the request itself was an auth refresh to prevent deadlocks
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
