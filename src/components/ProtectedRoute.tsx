// ProtectedRoute.tsx — perubahan: hapus import ganda & double-refresh
import React, { useLayoutEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ProtectedRouteProps } from '../types/protectedroute';
// ─── BARU: hanya satu import, tanpa `api` karena sudah tidak dipakai langsung ─
import { verifySession } from '../services/api';
import PageSkeleton from './PageSkeleton';
// ────────────────────────────────────────────────────────────────────────────

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const {
    hasHydrated,
    isAuthenticated,
    user,
    sessionStatus,
    setAuth,
    logout,
    startSessionVerification,
    completeSessionVerification,
  } = useAuthStore();
  const location = useLocation();

  const bypass =
    import.meta.env.MODE === 'development' &&
    (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' ||
      import.meta.env.VITE_DEV_BYPASS_AUTH === '1');
  const hasStartedVerificationRef = useRef(false);
  const isSessionPending =
    !bypass && hasHydrated && isAuthenticated && Boolean(user) && sessionStatus !== 'verified';

  useLayoutEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    if (bypass) {
      if (!isAuthenticated || !user) {
        setAuth({
          id: 'dev-preview',
          name: 'Dev Preview',
          email: 'dev@local',
          role: 'SUPER_ADMIN',
        });
      }
      return () => {
        cancelled = true;
      };
    }

    if (!hasHydrated) {
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthenticated || !user) {
      hasStartedVerificationRef.current = false;
      return;
    }

    if (sessionStatus === 'verified') {
      hasStartedVerificationRef.current = true;
      return;
    }

    if (sessionStatus === 'verifying' && hasStartedVerificationRef.current) {
      return;
    }

    hasStartedVerificationRef.current = true;
    startSessionVerification();

    const verify = async (attempt = 0) => {
      try {
        // ─── DIPERBAIKI: hapus `await api.post('/auth/refresh', {})` ─────────
        // Dulu ada dua panggilan berurutan:
        //   1. api.post('/auth/refresh', {})  ← bypass mutex, rotate token
        //   2. verifySession()                ← rotate lagi → backend 401
        // Sekarang cukup satu panggilan yang sudah punya mutex built-in:
        await verifySession();
        // ────────────────────────────────────────────────────────────────────

        if (!cancelled) {
          completeSessionVerification();
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;

        // Rate limited — retry dengan exponential backoff
        if (!cancelled && status === 429) {
          const delayMs = Math.min(30_000, 2000 * (attempt + 1));
          retryTimer = setTimeout(() => {
            if (!cancelled) void verify(attempt + 1);
          }, delayMs);
          return;
        }

        // Logout hanya untuk kegagalan auth yang definitif (401/403)
        // Network error, 500, dll → jangan paksa logout
        if (!cancelled && (status === 401 || status === 403)) {
          hasStartedVerificationRef.current = false;
          logout();
          return;
        }

        if (!cancelled) {
          completeSessionVerification();
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [
    hasHydrated,
    isAuthenticated,
    user,
    sessionStatus,
    setAuth,
    logout,
    bypass,
    startSessionVerification,
    completeSessionVerification,
  ]);

  if (bypass) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!hasHydrated) {
    return <PageSkeleton />;
  }

  if (isSessionPending) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'CONTENT_ADMIN' ? '/public-site' : '/dashboard'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
