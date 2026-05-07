import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const apiBaseUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // Send cookies automatically
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Handle 401 responses and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const url = String(originalRequest?.url || '');
    let pathname = url;
    try {
      pathname = new URL(url, window.location.origin).pathname;
    } catch {
      pathname = url;
    }
    const isPublicRequest = pathname.includes('/public-site/');
    const { isAuthenticated } = useAuthStore.getState();

    if (error.response?.status === 401 && (!isAuthenticated || isPublicRequest)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api.request(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh', {});

        processQueue(null);
        
        // Retry original request
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh token expired or invalid, logout
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
