import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import api from '@/services/api';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useAutoLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
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
        window.location.href = '/login';
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Set initial timer
    resetTimer();

    // Events that reset the timer
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart'
    ];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);
}
