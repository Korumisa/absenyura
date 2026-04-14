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
import ScrollToTop from "@/components/ScrollToTop";

// Halaman Publik Baru
import Features from "@/pages/public/Features";
import HowItWorks from "@/pages/public/HowItWorks";
import Pricing from "@/pages/public/Pricing";
import AboutUs from "@/pages/public/AboutUs";

// Komponen Placeholder untuk tautan yang belum dibuat filenya agar tidak Error/Blank
const ComingSoon = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center font-sans">
    <h1 className="text-4xl font-bold mb-4">Segera Hadir</h1>
    <p className="text-white/50">Halaman ini sedang dalam tahap pengembangan.</p>
    <a href="/" className="mt-8 px-6 py-3 bg-white text-black rounded-full font-medium">Kembali ke Beranda</a>
  </div>
);

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
        <ScrollToTop />
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
          
          {/* Public Static Pages */}
          <Route path="/fitur-utama" element={<Features />} />
          <Route path="/cara-kerja" element={<HowItWorks />} />
          <Route path="/harga-paket" element={<Pricing />} />
          <Route path="/tentang-kami" element={<AboutUs />} />
          
          {/* Fallback Pages (Agar tidak Blank) */}
          <Route path="/hubungi-kami" element={<ComingSoon />} />
          <Route path="/keamanan-gps" element={<ComingSoon />} />
          <Route path="/integrasi-api" element={<ComingSoon />} />
          <Route path="/pusat-bantuan" element={<ComingSoon />} />
          <Route path="/dokumentasi-api" element={<ComingSoon />} />
          <Route path="/status-sistem" element={<ComingSoon />} />
          <Route path="/karir" element={<ComingSoon />} />
          <Route path="/mitra-kampus" element={<ComingSoon />} />
          
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
            </Route>
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}