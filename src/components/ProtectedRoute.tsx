import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ProtectedRouteProps } from '../types/protectedroute';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, setAuth, logout } = useAuthStore();
  const location = useLocation();
  const sessionVerifiedRef = useRef(false);
  const bypass =
    import.meta.env.MODE === 'development' &&
    (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' ||
      import.meta.env.VITE_DEV_BYPASS_AUTH === '1');

  useEffect(() => {
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

    if (!isAuthenticated || !user) {
      sessionVerifiedRef.current = false;
      return;
    }

    if (sessionVerifiedRef.current) return;

    const verify = async (attempt = 0) => {
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        if (!cancelled) {
          sessionVerifiedRef.current = true;
          setAuth(user);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (!cancelled && status === 429) {
          const delayMs = Math.min(30_000, 2000 * (attempt + 1));
          retryTimer = setTimeout(() => {
            if (!cancelled) void verify(attempt + 1);
          }, delayMs);
          return;
        }
        if (!cancelled) {
          sessionVerifiedRef.current = false;
          logout();
        }
      }
    };

    void verify();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isAuthenticated, user?.id, setAuth, logout, bypass]);

  if (bypass) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'CONTENT_ADMIN' ? '/public-site' : '/dashboard'} replace />;
  }

  // Biarkan layout dan skeleton halaman dirender sambil refresh sesi berjalan di background.
  return children ? <>{children}</> : <Outlet />;
};
