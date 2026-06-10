import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const menuId = 'user-account-menu';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    firstActionRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="flex items-center gap-3 rounded-lg border-l border-border py-1 pl-4 pr-2 transition-colors hover:bg-muted/50 focus:outline-none"
      >
        <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 text-brand font-bold">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="hidden sm:flex flex-col items-start text-left">
          <span className="text-sm font-medium leading-tight text-foreground">
            {user?.name || 'User'}
          </span>
          <span className="text-xs text-muted-foreground leading-tight truncate max-w-[120px]">
            {user?.email}
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Menu akun pengguna"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            <p className="text-xs mt-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 text-brand rounded-full font-semibold">
              {user?.role || 'USER'}
            </p>
          </div>
          <div className="py-1">
            <button
              ref={firstActionRef}
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              role="menuitem"
              className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted dark:hover:bg-zinc-900 flex items-center gap-2"
            >
              <Settings size={16} />
              Pengaturan Akun
            </button>
            <div className="h-px bg-slate-200 bg-muted my-1"></div>
            <button
              onClick={handleLogout}
              role="menuitem"
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
