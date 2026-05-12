import React, { useEffect } from 'react';
import axios from 'axios';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ProtectedRouteProps } from '../types/protectedroute';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, setAuth, logout } = useAuthStore();
  const location = useLocation();
  const bypass =
    import.meta.env.MODE === 'development' &&
    (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' || import.meta.env.VITE_DEV_BYPASS_AUTH === '1');

  useEffect(() => {
    let cancelled = false;

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

    const verify = async () => {
      if (!isAuthenticated || !user) return;
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        if (!cancelled) setAuth(user);
      } catch {
        if (!cancelled) logout();
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, setAuth, logout]);

  if (bypass) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'CONTENT_ADMIN' ? '/public-site' : '/dashboard'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
