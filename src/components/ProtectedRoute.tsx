import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ProtectedRouteProps } from '../types/protectedroute';
import { useSessionVerifier } from '../hooks/useSessionVerifier';
import PageSkeleton from './PageSkeleton';
import { saveTarget } from '@/lib/auth/postLoginTarget';

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
    return <Navigate to="/forbidden" state={{ from: location.pathname }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
