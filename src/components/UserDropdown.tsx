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
        className="flex items-center gap-3 pl-4 border-l border-border border-border focus:outline-none hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg py-1 pr-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 text-brand font-bold">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="hidden sm:flex flex-col items-start text-left">
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 leading-tight">{user?.name || 'User'}</span>
          <span className="text-xs text-muted-foreground text-muted-foreground leading-tight truncate max-w-[120px]">{user?.email}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white bg-card rounded-lg shadow-lg border border-border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-border border-border bg-slate-50 bg-background/50">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground text-muted-foreground truncate">{user?.email || ''}</p>
            <p className="text-xs mt-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 text-brand rounded-full font-semibold">{user?.role || 'USER'}</p>
          </div>
          <div className="py-1">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-muted dark:hover:bg-zinc-900 flex items-center gap-2"
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