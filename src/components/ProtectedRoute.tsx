import React, { useEffect } from 'react';
import axios from 'axios';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, setAuth, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

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

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
