import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LayoutDashboard, Users, MapPin, Calendar, Menu, X, QrCode, BarChart3, ShieldAlert, History, BookOpen, FileText, Building2, Globe, ChevronDown, ChevronRight, Home, User, Layers, Newspaper, Image, ClipboardList } from 'lucide-react';
import api from '@/services/api';

import { NotificationMenu } from './NotificationMenu';
import { UserDropdown } from './UserDropdown';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ThemeToggle';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [publicSiteOpen, setPublicSiteOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
    { name: 'Kelas Kuliah', path: '/classes', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
    { name: 'Sesi Absensi', path: '/sessions', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
    { name: 'Pemindai QR', path: '/attend', icon: QrCode, roles: ['USER'] },
    { name: 'Pengajuan Izin', path: '/excuses', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
    { name: 'Riwayat Saya', path: '/history', icon: History, roles: ['USER'] },
    { name: 'Manajemen Lokasi', path: '/locations', icon: MapPin, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { name: 'Rekap Kehadiran', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { name: 'Konten Website', path: '/public-site', icon: Globe, roles: ['SUPER_ADMIN', 'CONTENT_ADMIN'] },
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

  return (
    <div className="flex min-h-dvh bg-slate-50 dark:bg-zinc-900 overflow-hidden font-sans">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          className="fixed inset-0 z-20 bg-slate-900/50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Absensyura</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-slate-500" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={24} />
          </Button>
        </div>

        <div className="flex flex-col h-[calc(100vh-4rem)] justify-between pb-6">
          <nav className="p-4 space-y-1 overflow-y-auto">
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
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-semibold flex-1 text-left">{item.name}</span>
                      {publicSiteOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {publicSiteOpen ? (
                      <div className="ml-3 pl-4 border-l border-emerald-200/70 dark:border-emerald-900/40 space-y-1">
                        {[
                          { name: 'Halaman Utama', path: '/public-site', icon: Home },
                          { name: 'Profil', path: '/public-site/profile', icon: User },
                          { name: 'Struktur', path: '/public-site/structure', icon: Layers },
                          { name: 'Program Kerja', path: '/public-site/programs', icon: ClipboardList },
                          { name: 'Berita & Info', path: '/public-site/posts', icon: Newspaper },
                          { name: 'Galeri', path: '/public-site/galleries', icon: Image },
                          { name: 'Open Recruitment', path: '/public-site/recruitments', icon: FileText },
                        ].map((sub) => {
                          const subActive = location.pathname === sub.path;
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors text-sm ${
                                subActive
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                              }`}
                            >
                              <SubIcon size={18} className={subActive ? 'opacity-90' : 'opacity-70'} />
                              <span className="font-medium">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon size={20} className="mr-3" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden mr-2" 
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka sidebar"
            >
              <Menu size={24} />
            </Button>
            <span className="lg:hidden text-lg font-bold text-indigo-600 dark:text-indigo-400">Absensyura</span>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <ModeToggle />
            <NotificationMenu />
            <UserDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
