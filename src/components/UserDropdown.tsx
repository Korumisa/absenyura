import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg border-l border-border py-1 pl-4 pr-2 transition-colors hover:bg-muted/50 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 text-brand font-bold">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="hidden sm:flex flex-col items-start text-left">
          <span className="text-sm font-medium leading-tight text-foreground">{user?.name || 'User'}</span>
          <span className="text-xs text-muted-foreground leading-tight truncate max-w-[120px]">{user?.email}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            <p className="text-xs mt-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 text-brand rounded-full font-semibold">{user?.role || 'USER'}</p>
          </div>
          <div className="py-1">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted dark:hover:bg-zinc-900 flex items-center gap-2"
            >
              <Settings size={16} />
              Pengaturan Akun
            </button>
            <div className="h-px bg-slate-200 bg-muted my-1"></div>
            <button 
              onClick={handleLogout}
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