import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { verifySession } from '@/services/api';
import { saveTarget } from '@/lib/auth/postLoginTarget';

type SessionStatus = 'guest' | 'unknown' | 'verifying' | 'verified';

interface UseSessionVerifierReturn {
  sessionStatus: SessionStatus;
  verifyNow: () => Promise<void>;
  isVerifying: boolean;
}

let globalIsVerifying = false;
let globalVerifyPromise: Promise<void> | null = null;

export function useSessionVerifier(): UseSessionVerifierReturn {
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const startSessionVerification = useAuthStore((state) => state.startSessionVerification);
  const completeSessionVerification = useAuthStore((state) => state.completeSessionVerification);
  const logout = useAuthStore((state) => state.logout);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const cancelledRef = useRef(false);

  const isVerifying = sessionStatus === 'verifying';

  const verifyNow = useCallback(async () => {
    if (cancelledRef.current) return;

    if (!hasHydrated || !isAuthenticated || !user) {
      return;
    }

    if (globalIsVerifying && globalVerifyPromise) {
      return globalVerifyPromise;
    }

    if (sessionStatus === 'verified') {
      return;
    }

    globalIsVerifying = true;

    const doVerify = async (attempt = 0): Promise<void> => {
      if (cancelledRef.current) return;

      startSessionVerification();

      try {
        await verifySession();
        if (!cancelledRef.current) {
          completeSessionVerification();
        }
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;

        if (!cancelledRef.current && status === 429) {
          const delayMs = Math.min(30_000, 2000 * Math.pow(2, attempt));
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          await new Promise<void>((resolve) => {
            retryTimerRef.current = setTimeout(resolve, delayMs);
          });
          if (!cancelledRef.current) {
            return doVerify(attempt + 1);
          }
          return;
        }

        if (!cancelledRef.current && (status === 401 || status === 403)) {
          saveTarget(window.location.pathname + window.location.search + window.location.hash);
          logout();
          return;
        }

        if (!cancelledRef.current) {
          completeSessionVerification();
        }
      }
    };

    globalVerifyPromise = doVerify();
    try {
      await globalVerifyPromise;
    } finally {
      globalIsVerifying = false;
      globalVerifyPromise = null;
    }
  }, [
    hasHydrated,
    isAuthenticated,
    user,
    sessionStatus,
    startSessionVerification,
    completeSessionVerification,
    logout,
  ]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user) {
      return;
    }

    if (sessionStatus === 'verified') {
      return;
    }

    if (sessionStatus === 'verifying' && globalIsVerifying) {
      return;
    }

    void verifyNow();
  }, [hasHydrated, isAuthenticated, user, sessionStatus, verifyNow]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return {
    sessionStatus,
    verifyNow,
    isVerifying,
  };
}
