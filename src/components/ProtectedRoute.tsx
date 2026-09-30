import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ProtectedRouteProps } from '../types/protectedroute';
import { useSessionVerifier } from '../hooks/useSessionVerifier';
import PageSkeleton from './PageSkeleton';
import { saveTarget } from '@/lib/auth/postLoginTarget';

const NOINDEX_SELECTOR = 'meta[name="robots"][data-protected-route="true"]';

function upsertNoindexMeta() {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(NOINDEX_SELECTOR) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.name = 'robots';
    el.setAttribute('data-protected-route', 'true');
    document.head.appendChild(el);
  }
  el.content = 'noindex, nofollow, nosnippet, noarchive';
}

function removeNoindexMeta() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(NOINDEX_SELECTOR).forEach((n) => n.remove());
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { hasHydrated, isAuthenticated, user, setAuth } = useAuthStore();
  const { sessionStatus } = useSessionVerifier();
  const location = useLocation();

  const bypass =
    import.meta.env.MODE === 'development' &&
    (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' ||
      import.meta.env.VITE_DEV_BYPASS_AUTH === '1');
  const isSessionPending =
    !bypass && hasHydrated && isAuthenticated && Boolean(user) && sessionStatus !== 'verified';

  useEffect(() => {
    if (bypass && (!isAuthenticated || !user)) {
      setAuth({
        id: 'dev-preview',
        name: 'Dev Preview',
        email: 'dev@local',
        role: 'SUPER_ADMIN',
      });
    }
  }, [bypass, isAuthenticated, user, setAuth]);

  useEffect(() => {
    upsertNoindexMeta();
    return () => removeNoindexMeta();
  }, []);

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
    saveTarget(location.pathname + location.search + location.hash);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
