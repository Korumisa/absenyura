import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

import Users from "@/pages/Users";
import Classes from "@/pages/Classes";
import Excuses from "@/pages/Excuses";
import Locations from "@/pages/Locations";
import Sessions from "@/pages/Sessions";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AuditLogs from "@/pages/AuditLogs";
import History from "@/pages/History";
import QRDisplay from "@/pages/QRDisplay";
import Attend from "@/pages/Attend";

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const getDefaultRoute = () => {
    if (user?.role === 'SUPER_ADMIN') return '/dashboard';
    if (user?.role === 'ADMIN') return '/sessions';
    if (user?.role === 'USER') return '/dashboard';
    return '/dashboard';
  };

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id/qr" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><QRDisplay /></ProtectedRoute>} />
              <Route path="/attend" element={<ProtectedRoute allowedRoles={['USER']}><Attend /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute allowedRoles={['USER']}><History /></ProtectedRoute>} />
              <Route path="/classes" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}><Classes /></ProtectedRoute>} />
              <Route path="/excuses" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}><Excuses /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Users /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Locations /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}><Settings /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AuditLogs /></ProtectedRoute>} />
              {/* Other protected routes go here */}
              <Route path="/other" element={<div className="p-8 text-xl font-medium text-slate-700 dark:text-zinc-300">Other Page - Coming Soon</div>} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}