import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ROLE_LABEL, type AdminRole } from '@/components/admin/adminNav';

function getInitials(name: string | undefined): string {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const menuId = 'user-account-menu';
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const initials = getInitials(user?.name);
  const roleLabel = ROLE_LABEL[(user?.role as AdminRole) ?? 'USER'] ?? user?.role ?? 'Pengguna';

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
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-haspopup="menu"
        aria-label="Menu akun pengguna"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="flex min-h-11 min-w-11 items-center gap-3 rounded-lg py-1 pl-1.5 pr-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:pl-2"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand dark:bg-brand/20">
          {initials}
        </div>
        <div className="hidden max-w-[150px] flex-col items-start text-left sm:flex">
          <span className="w-full truncate text-sm font-medium leading-tight text-foreground">
            {user?.name || 'User'}
          </span>
          <span className="w-full truncate text-xs leading-tight text-muted-foreground">
            {roleLabel}
          </span>
        </div>
        <ChevronDown
          size={14}
          aria-hidden
          className={`hidden text-muted-foreground transition-transform sm:block ${isOpen ? 'rotate-180' : ''}`}
        />
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
            <p className="mt-1.5 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand dark:bg-brand/20">
              {roleLabel}
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
              className="flex min-h-10 w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
            >
              <Settings size={16} />
              Pengaturan Akun
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                setIsOpen(false);
                setConfirmLogoutOpen(true);
              }}
              role="menuitem"
              className="flex min-h-10 w-full items-center gap-2 px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
            >
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmLogoutOpen}
        onClose={() => setConfirmLogoutOpen(false)}
        onConfirm={handleLogout}
        variant="danger"
        title="Keluar dari akun?"
        description="Perubahan yang belum disimpan akan hilang. Anda yakin ingin keluar?"
        confirmText="Ya, Keluar"
        cancelText="Batal"
      />
    </div>
  );
}
