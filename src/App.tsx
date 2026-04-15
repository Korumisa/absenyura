import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";
import { useAutoLogout } from "@/hooks/useAutoLogout";

import Users from "@/pages/Users";
import Classes from "@/pages/Classes";
import Excuses from "@/pages/Excuses";
import Locations from "@/pages/Locations";
import Sessions from "@/pages/Sessions";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AuditLogs from "@/pages/AuditLogs";
import MasterData from "./pages/MasterData";
import HistoryPage from "@/pages/History";
import QRDisplay from "@/pages/QRDisplay";
import Attend from "@/pages/Attend";
import Features from "@/pages/public/Features";
import HowItWorks from "@/pages/public/HowItWorks";
import Pricing from "@/pages/public/Pricing";
import Contact from "@/pages/public/Contact";
import ComingSoon from "@/pages/public/ComingSoon";
import ScrollToTop from "@/components/ScrollToTop";
import GpsSecurity from "@/pages/public/GpsSecurity";
import ApiIntegration from "@/pages/public/ApiIntegration";
import HelpCenter from "@/pages/public/HelpCenter";
import ApiDocs from "@/pages/public/ApiDocs";
import SystemStatus from "@/pages/public/SystemStatus";
import AboutUs from "@/pages/public/AboutUs";
import Careers from "@/pages/public/Careers";
import CampusPartners from "@/pages/public/CampusPartners";

import { ThemeProvider } from "@/providers/theme-provider";
import { useEffect } from "react";
import { getOfflineAttendances, deleteOfflineAttendance } from "@/lib/idb";
import api from "@/services/api";

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useAutoLogout();

  useEffect(() => {
    const syncOfflineData = async () => {
      if (navigator.onLine && isAuthenticated) {
        try {
          const offlineData = await getOfflineAttendances();
          if (offlineData.length === 0) return;

          console.log(`Syncing ${offlineData.length} offline attendances...`);
          for (const item of offlineData) {
            const formData = new FormData();
            formData.append('session_id', item.session_id);
            if (item.token) formData.append('qr_token', item.token);
            formData.append('latitude', item.lat.toString());
            formData.append('longitude', item.lng.toString());
            formData.append('device_fingerprint', item.deviceInfo + ' [OFFLINE_SYNC]');
            // Assuming we allow no-photo for offline sync as fallback, or we could have saved photoBlob to IDB as well.
            // For simplicity in this PWA version, offline sync might skip photo or use a placeholder.

            try {
              await api.post('/attendance/check-in', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              if (item.id) await deleteOfflineAttendance(item.id);
            } catch (err: any) {
              // If already checked in (400), we can still delete it from local queue
              if (err.response?.status === 400) {
                if (item.id) await deleteOfflineAttendance(item.id);
              }
              console.error('Failed to sync attendance', err);
            }
          }
        } catch (error) {
          console.error('Offline sync error', error);
        }
      }
    };

    window.addEventListener('online', syncOfflineData);
    // Also try to sync on initial load if online
    if (navigator.onLine) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener('online', syncOfflineData);
    };
  }, [isAuthenticated]);

  const getDefaultRoute = () => {
    if (user?.role === 'SUPER_ADMIN') return '/dashboard';
    if (user?.role === 'ADMIN') return '/sessions';
    if (user?.role === 'USER') return '/dashboard';
    return '/dashboard';
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="absensyura-theme">
      <ErrorBoundary>
        <Toaster position="top-right" richColors />
        <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
          
          {/* Public Static Pages */}
          <Route path="/fitur-utama" element={<Features />} />
          <Route path="/cara-kerja" element={<HowItWorks />} />
          <Route path="/harga-paket" element={<Pricing />} />
          <Route path="/hubungi-kami" element={<Contact />} />
          
          <Route path="/keamanan-gps" element={<GpsSecurity />} />
          <Route path="/integrasi-api" element={<ApiIntegration />} />
          <Route path="/pusat-bantuan" element={<HelpCenter />} />
          <Route path="/dokumentasi-api" element={<ApiDocs />} />
          <Route path="/blog-artikel" element={<ComingSoon />} />
          <Route path="/status-sistem" element={<SystemStatus />} />
          <Route path="/tentang-kami" element={<AboutUs />} />
          <Route path="/karir" element={<Careers />} />
          <Route path="/mitra-kampus" element={<CampusPartners />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id/qr" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><QRDisplay /></ProtectedRoute>} />
              <Route path="/attend" element={<ProtectedRoute allowedRoles={['USER']}><Attend /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute allowedRoles={['USER']}><HistoryPage /></ProtectedRoute>} />
              <Route path="/classes" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}><Classes /></ProtectedRoute>} />
              <Route path="/excuses" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}><Excuses /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Users /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Locations /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}><Settings /></ProtectedRoute>} />
              <Route path="/master-data" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><MasterData /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AuditLogs /></ProtectedRoute>} />
              {/* Other protected routes go here */}
              <Route path="/other" element={<div className="p-8 text-xl font-medium text-slate-700 dark:text-zinc-300">Other Page - Coming Soon</div>} />
            </Route>
          </Route>
        </Routes>
      </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}