import React, { useEffect } from 'react';
import axios from 'axios';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, accessToken, setAuth, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!isAuthenticated || !user || accessToken) return;
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newAccessToken = res.data?.data?.accessToken;
        if (!newAccessToken) throw new Error('Missing accessToken');
        if (!cancelled) setAuth(user, newAccessToken);
      } catch {
        if (!cancelled) logout();
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, accessToken, setAuth, logout]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!accessToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
        <div className="text-sm font-medium text-slate-600 dark:text-zinc-400">Memverifikasi sesi...</div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
