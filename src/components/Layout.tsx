import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LayoutDashboard, Users, MapPin, Calendar, Settings, LogOut, Menu, X, QrCode, BarChart3, ShieldAlert, History, BookOpen, FileText } from 'lucide-react';
import api from '@/services/api';

import { NotificationMenu } from './NotificationMenu';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    { name: 'Pengguna', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { name: 'Audit Log', path: '/audit', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
    { name: 'Pengaturan', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  ];

  const allowedNavItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-900 overflow-hidden font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">AbsensiWeb</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-slate-500" 
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </Button>
        </div>

        <div className="flex flex-col h-[calc(100vh-4rem)] justify-between">
          <nav className="p-4 space-y-1 overflow-y-auto">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
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

          <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center px-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold mr-3">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <LogOut size={18} className="mr-3" />
              Keluar
            </Button>
          </div>
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
            >
              <Menu size={24} />
            </Button>
            <span className="lg:hidden text-lg font-bold text-indigo-600 dark:text-indigo-400">AbsensiWeb</span>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <NotificationMenu />
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{user?.name || 'User'}</span>
            </div>
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