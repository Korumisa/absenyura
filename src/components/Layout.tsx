import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  Menu,
  X,
  QrCode,
  BarChart3,
  ShieldAlert,
  History,
  BookOpen,
  FileText,
  Building2,
  Globe,
  ChevronDown,
  User,
  Layers,
  Newspaper,
  Image,
  ClipboardList,
} from 'lucide-react';

import { NotificationMenu } from './NotificationMenu';
import { UserDropdown } from './UserDropdown';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { AdminRouteTransition } from '@/components/admin/AdminRouteTransition';
import PageSkeleton from '@/components/PageSkeleton';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [publicSiteOpen, setPublicSiteOpen] = useState(false);
  const { user, isAuthenticated, hasHydrated, sessionStatus } = useAuthStore();
  const location = useLocation();
  const shouldShowSkeleton = !hasHydrated || (isAuthenticated && sessionStatus !== 'verified');

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    },
    {
      name: 'Kelas Kuliah',
      path: '/classes',
      icon: BookOpen,
      roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    },
    {
      name: 'Sesi Absensi',
      path: '/sessions',
      icon: Calendar,
      roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    },
    { name: 'Pemindai QR', path: '/attend', icon: QrCode, roles: ['USER'] },
    {
      name: 'Pengajuan Izin',
      path: '/excuses',
      icon: FileText,
      roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    },
    { name: 'Riwayat Saya', path: '/history', icon: History, roles: ['USER'] },
    { name: 'Manajemen Lokasi', path: '/locations', icon: MapPin, roles: ['SUPER_ADMIN', 'ADMIN'] },
    {
      name: 'Rekap Kehadiran',
      path: '/reports',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    },
    {
      name: 'Konten Website',
      path: '/public-site',
      icon: Globe,
      roles: ['SUPER_ADMIN', 'CONTENT_ADMIN'],
    },
    { name: 'Pengguna', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { name: 'Fakultas & Prodi', path: '/master-data', icon: Building2, roles: ['SUPER_ADMIN'] },
    { name: 'Audit Log', path: '/audit', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
  ];

  const allowedNavItems = navItems.filter((item) => user && item.roles.includes(user.role));
  const canPublicSite = Boolean(user && ['SUPER_ADMIN', 'CONTENT_ADMIN'].includes(user.role));

  useEffect(() => {
    if (!canPublicSite) return;
    if (location.pathname.startsWith('/public-site')) setPublicSiteOpen(true);
  }, [canPublicSite, location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navLinkClass = (isActive: boolean) =>
    isActive
      ? 'bg-sidebar-active text-brand select-none'
      : 'text-muted-foreground hover:bg-muted select-none';

  const navIconClass = (isActive: boolean) => (isActive ? 'text-brand' : 'text-muted-foreground');

  if (shouldShowSkeleton) {
    return <PageSkeleton />;
  }

  return (
    <div className="admin-theme flex h-dvh overflow-hidden bg-sidebar font-sans">
      <a
        href="#app-main-scroll"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand focus:shadow-lg"
      >
        Lewati ke konten utama
      </a>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          className="fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-sidebar-border bg-card transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border bg-card px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-hmsdp.webp"
              alt="Logo HM"
              className="size-9 rounded-xl bg-background/70 p-1.5 ring-1 ring-border"
            />
            <span className="text-lg font-semibold text-brand">E-Absensi</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={24} />
          </Button>
        </div>

        <div className="flex h-[calc(100dvh-4rem)] flex-col justify-between pb-6">
          <nav className="scrollbar-hide space-y-1 overflow-y-auto p-4">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              if (item.path === '/public-site') {
                if (!canPublicSite) return null;
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setPublicSiteOpen((v) => !v)}
                      aria-expanded={publicSiteOpen}
                      aria-controls="public-site-subnav"
                      className={`flex w-full items-center rounded-xl px-4 py-3 transition-colors select-none ${navLinkClass(isActive)}`}
                    >
                      <Icon size={20} className={`mr-3 ${navIconClass(isActive)}`} />
                      <span className="flex-1 text-left font-medium">{item.name}</span>
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${publicSiteOpen ? 'rotate-0' : '-rotate-90'}`}
                      />
                    </button>

                    <div
                      id="public-site-subnav"
                      className={`overflow-hidden pl-4 transition-all duration-200 ease-out ${
                        publicSiteOpen
                          ? 'max-h-96 translate-y-0 opacity-100'
                          : 'max-h-0 -translate-y-1 opacity-0'
                      }`}
                    >
                      <div className="space-y-1 pt-1">
                        {[
                          { name: 'Profil', path: '/public-site/profile', icon: User },
                          { name: 'Struktur', path: '/public-site/structure', icon: Layers },
                          {
                            name: 'Program Kerja',
                            path: '/public-site/programs',
                            icon: ClipboardList,
                          },
                          { name: 'Berita & Info', path: '/public-site/posts', icon: Newspaper },
                          { name: 'Galeri', path: '/public-site/galleries', icon: Image },
                          {
                            name: 'Open Recruitment',
                            path: '/public-site/recruitments',
                            icon: FileText,
                          },
                        ].map((sub) => {
                          const subActive = location.pathname === sub.path;
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              aria-current={subActive ? 'page' : undefined}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center rounded-xl px-4 py-2 text-sm transition-colors select-none ${navLinkClass(subActive)}`}
                            >
                              <SubIcon size={18} className="mr-3 opacity-80" />
                              <span className="font-medium">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center rounded-xl px-4 py-3 transition-colors ${navLinkClass(isActive)}`}
                >
                  <Icon size={20} className={`mr-3 ${navIconClass(isActive)}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-64">
        <header className="flex h-16 items-center justify-between border-b border-sidebar-border bg-card px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka sidebar"
            >
              <Menu size={24} />
            </Button>
            <div className="flex items-center gap-2 lg:hidden">
              <img
                src="/logo-hmsdp.webp"
                alt="Logo HM"
                className="size-8 rounded-lg bg-background/70 p-1 ring-1 ring-border"
              />
              <span className="text-lg font-semibold text-brand">E-Absensi</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <NotificationMenu />
            <UserDropdown />
          </div>
        </header>

        <main
          id="app-main-scroll"
          className="min-h-0 flex-1 overflow-y-auto bg-sidebar pb-6 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <AdminRouteTransition>
            <Outlet />
          </AdminRouteTransition>
        </main>
      </div>
    </div>
  );
}
