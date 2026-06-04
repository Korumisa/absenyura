import { Suspense, useEffect } from 'react';
import { lazyWithRetry } from '@/lib/perf/lazyWithRetry';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import ScrollToTop from '@/components/ScrollToTop';

import { ThemeProvider } from '@/providers/theme-provider';
import { getOfflineAttendances, deleteOfflineAttendance, getOfflinePhoto } from '@/lib/storage/idb';
import { getDeviceFingerprint } from '@/lib/storage/deviceFingerprint';
import { dispatchAppOnline, ONLINE_USER_MESSAGE } from '@/lib/perf/networkEvents';
import api from '@/services/api';
import { useAppStatusStore } from '@/stores/appStatusStore';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

const Login = lazyWithRetry(() => import('@/pages/Login'));
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
const Users = lazyWithRetry(() => import('@/pages/Users'));
const Classes = lazyWithRetry(() => import('@/pages/Classes'));
const ClassStudents = lazyWithRetry(() => import('@/pages/ClassStudents'));
const StudentDetail = lazyWithRetry(() => import('@/pages/StudentDetail'));
const StudentAttendanceRecap = lazyWithRetry(() => import('@/pages/StudentAttendanceRecap'));
const Excuses = lazyWithRetry(() => import('@/pages/Excuses'));
const Locations = lazyWithRetry(() => import('@/pages/Locations'));
const Sessions = lazyWithRetry(() => import('@/pages/Sessions'));
const Reports = lazyWithRetry(() => import('@/pages/Reports'));
const Settings = lazyWithRetry(() => import('@/pages/Settings'));
const AuditLogs = lazyWithRetry(() => import('@/pages/AuditLogs'));
const MasterData = lazyWithRetry(() => import('@/pages/MasterData'));
const HistoryPage = lazyWithRetry(() => import('@/pages/History'));
const QRDisplay = lazyWithRetry(() => import('@/pages/QRDisplay'));
const Attend = lazyWithRetry(() => import('@/pages/Attend'));

const PublicSiteProfile = lazyWithRetry(() => import('@/pages/publicSiteAdmin/PublicSiteProfile'));
const PublicSiteStructure = lazyWithRetry(
  () => import('@/pages/publicSiteAdmin/PublicSiteStructure')
);
const PublicSitePrograms = lazyWithRetry(
  () => import('@/pages/publicSiteAdmin/PublicSitePrograms')
);
const PublicSitePosts = lazyWithRetry(() => import('@/pages/publicSiteAdmin/PublicSitePosts'));
const PublicSiteGalleries = lazyWithRetry(
  () => import('@/pages/publicSiteAdmin/PublicSiteGalleries')
);
const PublicSiteRecruitments = lazyWithRetry(
  () => import('@/pages/publicSiteAdmin/PublicSiteRecruitments')
);

const PublicHome = lazyWithRetry(() => import('@/pages/public/PublicHome'));
const Berita = lazyWithRetry(() => import('@/pages/public/Berita'));
const BeritaDetail = lazyWithRetry(() => import('@/pages/public/BeritaDetail'));
const Fungsionaris = lazyWithRetry(() => import('@/pages/public/Fungsionaris'));
const ProgramKerja = lazyWithRetry(() => import('@/pages/public/ProgramKerja'));
const ProgramKerjaDetail = lazyWithRetry(() => import('@/pages/public/ProgramKerjaDetail'));
const InformasiLomba = lazyWithRetry(() => import('@/pages/public/InformasiLomba'));
const Kegiatan = lazyWithRetry(() => import('@/pages/public/Kegiatan'));
const Galeri = lazyWithRetry(() => import('@/pages/public/Galeri'));
const OpenRecruitment = lazyWithRetry(() => import('@/pages/public/OpenRecruitment'));

/**
 * Suspense hanya menunggu unduhan chunk JS (code-split).
 * Loading data/API ditangani skeleton per halaman — hindari "Memuat halaman..." ganda.
 */
function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isMaintenance = useAppStatusStore((s) => s.isMaintenance);
  const maintenanceReason = useAppStatusStore((s) => s.reason);
  const clearNetworkIssues = useAppStatusStore((s) => s.clearNetworkIssues);
  const setMaintenance = useAppStatusStore((s) => s.setMaintenance);
  const setOffline = useAppStatusStore((s) => s.setOffline);

  useAutoLogout();

  useEffect(() => {
    if (!isAuthenticated) return;
    const prefetch = () => {
      void import('@/pages/Sessions');
      void import('@/pages/Reports');
      void import('@/pages/Locations');
      void import('@/pages/Classes');
      void import('@/pages/QRDisplay');
    };
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;
    const cancelRic = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
    if (ric && cancelRic) {
      const id = ric(prefetch, { timeout: 2000 });
      return () => cancelRic(id);
    }
    const timeoutId = window.setTimeout(prefetch, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated]);

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
            formData.append('accuracy', String(item.accuracy ?? 0));
            const offlineFingerprint =
              item.deviceInfo && item.deviceInfo.length >= 16
                ? item.deviceInfo
                : await getDeviceFingerprint();
            formData.append('device_fingerprint', offlineFingerprint);
            let photo: Blob | undefined;
            if (item.id) {
              photo = await getOfflinePhoto(item.id);
              if (photo) {
                const photoType = photo.type || 'image/jpeg';
                const challengeRes = await api.get('/attendance/challenge', {
                  params: {
                    action: 'checkin',
                    session_id: item.session_id,
                    latitude: item.lat,
                    longitude: item.lng,
                    accuracy: item.accuracy ?? 0,
                    photo_size: photo.size,
                    photo_type: photoType,
                  },
                });
                const nonce = challengeRes.data?.data?.nonce;
                const signature = challengeRes.data?.data?.signature;
                if (!nonce || !signature) {
                  throw new Error('Gagal mendapatkan security token untuk sinkronisasi offline');
                }
                formData.append('nonce', nonce);
                formData.append('signature', signature);
                formData.append('photo_size', photo.size.toString());
                formData.append('photo_type', photoType);
                formData.append('photo', photo, 'attendance.jpg');
              }
            }
            if (!photo) {
              console.warn(
                'Offline attendance is missing photo evidence; keeping it queued.',
                item.id
              );
              continue;
            }

            try {
              await api.post('/attendance/check-in', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              if (item.id) await deleteOfflineAttendance(item.id);
            } catch (err: any) {
              const errorText = String(
                err.response?.data?.error || err.response?.data?.message || ''
              ).toLowerCase();
              const alreadySynced =
                err.response?.status === 400 &&
                (errorText.includes('sudah melakukan check-in') ||
                  errorText.includes('sudah menyelesaikan absensi'));
              if (alreadySynced) {
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

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await api.get('/status');
        if (cancelled) return;
        if (res?.status === 200 && res?.data?.success === true) {
          clearNetworkIssues();
          return;
        }
        setMaintenance('Layanan sedang mengalami gangguan. Silakan coba lagi.');
      } catch {
        if (cancelled) return;
        if (navigator.onLine) {
          setMaintenance(
            'Server tidak dapat dihubungi. Mencoba lagi otomatis saat koneksi stabil.'
          );
        } else {
          setOffline(true);
        }
      }
    };

    const onOnline = () => {
      clearNetworkIssues();
      dispatchAppOnline();
      void checkHealth();
      toast.success(ONLINE_USER_MESSAGE, { id: 'network-online' });
    };
    const onOffline = () => {
      setOffline(true);
    };

    if (!navigator.onLine) {
      setOffline(true);
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    void checkHealth();

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [clearNetworkIssues, setMaintenance, setOffline]);

  const getDefaultRoute = () => {
    if (user?.role === 'CONTENT_ADMIN') return '/public-site/profile';
    return '/dashboard'; // [IA] #10 — semua role akademik ke dashboard
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="absensyura-theme">
      <ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            duration: 4000,
            classNames: { error: 'sonner-error', success: 'sonner-success' },
          }}
          closeButton
        />
        <PublicLoadingOverlay
          show={isMaintenance}
          label={maintenanceReason || 'Menghubungkan ke server...'}
        />
        <Router>
          <ScrollToTop />
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to={getDefaultRoute()} replace />
                ) : (
                  <PageSuspense>
                    <PublicHome />
                  </PageSuspense>
                )
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to={getDefaultRoute()} replace />
                ) : (
                  <PageSuspense>
                    <Login />
                  </PageSuspense>
                )
              }
            />

            {/* Public Static Pages */}
            <Route
              path="/berita"
              element={
                <PageSuspense>
                  <Berita />
                </PageSuspense>
              }
            />
            <Route
              path="/berita/:slug"
              element={
                <PageSuspense>
                  <BeritaDetail />
                </PageSuspense>
              }
            />
            <Route
              path="/kegiatan"
              element={
                <PageSuspense>
                  <Kegiatan />
                </PageSuspense>
              }
            />
            <Route
              path="/informasi"
              element={
                <PageSuspense>
                  <Kegiatan />
                </PageSuspense>
              }
            />
            <Route
              path="/struktur-organisasi"
              element={
                <PageSuspense>
                  <Fungsionaris />
                </PageSuspense>
              }
            />
            <Route
              path="/program-kerja"
              element={
                <PageSuspense>
                  <ProgramKerja />
                </PageSuspense>
              }
            />
            <Route
              path="/program-kerja/:id"
              element={
                <PageSuspense>
                  <ProgramKerjaDetail />
                </PageSuspense>
              }
            />
            <Route
              path="/informasi-lomba"
              element={
                <PageSuspense>
                  <InformasiLomba />
                </PageSuspense>
              }
            />
            <Route
              path="/galeri"
              element={
                <PageSuspense>
                  <Galeri />
                </PageSuspense>
              }
            />
            <Route
              path="/open-recruitment"
              element={
                <PageSuspense>
                  <OpenRecruitment />
                </PageSuspense>
              }
            />

            <Route element={<ProtectedRoute />}>
              <Route
                path="/sessions/:id/qr"
                element={
                  <PageSuspense>
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                      <QRDisplay />
                    </ProtectedRoute>
                  </PageSuspense>
                }
              />
              <Route element={<Layout />}>
                <Route
                  path="/dashboard"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
                        <Dashboard />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/sessions"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
                        <Sessions />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/attend"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['USER']}>
                        <Attend />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['USER']}>
                        <HistoryPage />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/classes"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
                        <Classes />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/classes/:classId"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
                        <ClassStudents />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/students/:studentId"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <StudentDetail />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/students/:studentId/attendance"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <StudentAttendanceRecap />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/excuses"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
                        <Excuses />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <Users />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/locations"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <Locations />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                        <Reports />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <Navigate to="/public-site/profile" replace />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site/profile"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <PublicSiteProfile />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site/structure"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <PublicSiteStructure />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site/programs"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <PublicSitePrograms />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site/posts"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <PublicSitePosts />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site/galleries"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <PublicSiteGalleries />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/public-site/recruitments"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_ADMIN']}>
                        <PublicSiteRecruitments />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
                        <Settings />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/master-data"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <MasterData />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <PageSuspense>
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <AuditLogs />
                      </ProtectedRoute>
                    </PageSuspense>
                  }
                />
                {/* Other protected routes go here */}
                <Route
                  path="/other"
                  element={
                    <div className="p-8 text-xl font-medium text-slate-700 dark:text-zinc-300">
                      Other Page - Coming Soon
                    </div>
                  }
                />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
