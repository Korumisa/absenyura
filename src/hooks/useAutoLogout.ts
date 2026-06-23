import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import api, { verifySession } from '@/services/api';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const PROACTIVE_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function useAutoLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use useCallback so the function always sees the latest isAuthenticated
  // and doesn't suffer from stale closures when called by event listeners.
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (isAuthenticated) {
      inactivityTimerRef.current = setTimeout(async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          // ignore
        }
        logout();
        toast.info('Anda telah logout otomatis karena tidak ada aktivitas selama 30 menit.');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isAuthenticated, logout]);

  const startProactiveRefresh = useCallback(() => {
    const refresh = async () => {
      if (!isAuthenticated) return;
      try {
        await verifySession();
      } catch (e) {
        // Ignore refresh errors - the response interceptor will handle it if needed
      }
    };

    // Initial refresh if authenticated
    if (isAuthenticated) {
      void refresh();
    }

    // Set up interval
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (isAuthenticated) {
      refreshTimerRef.current = setInterval(() => {
        void refresh();
      }, PROACTIVE_REFRESH_INTERVAL_MS);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any lingering timers when not authenticated
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Set initial timers
    resetInactivityTimer();
    startProactiveRefresh();

    // Events that reset the inactivity timer
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetInactivityTimer, startProactiveRefresh]);
}
