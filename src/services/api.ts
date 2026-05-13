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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

  if (!isSafe) {
    const token = getCookie('csrfToken');
    if (token) {
      const headers: any = config.headers ?? {};
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
  (response) => response,
  async (error) => {
    if (!error?.response) {
      useAppStatusStore.getState().setMaintenance('Server tidak dapat dihubungi. Silakan coba lagi.');
    }

    const originalRequest = error.config;

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
    const { isAuthenticated } = useAuthStore.getState();

    if (error.response?.status === 403 && !originalRequest._csrfRetry) {
      const apiError = error.response?.data?.error;
      if (apiError === 'CSRF validation failed') {
        originalRequest._csrfRetry = true;
        try {
          await api.post('/auth/refresh', {});
          return api.request(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    if (error.response?.status === 401 && (!isAuthenticated || isPublicRequest)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api.request(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh', {});
        processQueue(null);
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
