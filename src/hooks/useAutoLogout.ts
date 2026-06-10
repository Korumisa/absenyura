import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import api from '@/services/api';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useAutoLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use useCallback so the function always sees the latest isAuthenticated
  // and doesn't suffer from stale closures when called by event listeners.
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isAuthenticated) {
      timerRef.current = setTimeout(async () => {
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
      }, TIMEOUT_MS);
    }
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any lingering timer when not authenticated
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Set initial timer
    resetTimer();

    // Events that reset the timer
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimer]);
}
