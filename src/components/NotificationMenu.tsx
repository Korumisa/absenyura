import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuthStore } from '@/stores/authStore';
import { Notification } from '@/types/notificationmenu';

export function NotificationMenu() {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const popupId = 'notification-menu-panel';

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const markAsRead = async (idStr: string) => {
    try {
      await api.put(`/notifications/${idStr}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === idStr ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifikasi"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popupId}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-brand focus:outline-none dark:hover:text-indigo-400"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 size-4 bg-red-500 border-2 border-white dark:border-zinc-950 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div
            id={popupId}
            ref={panelRef}
            role="dialog"
            aria-label="Panel notifikasi"
            tabIndex={-1}
            className="absolute -right-12 sm:right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] bg-card text-card-foreground border border-border shadow-xl rounded-xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/50">
              <h3 className="font-bold text-foreground">Notifikasi</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand hover:text-indigo-700 text-brand font-medium flex items-center gap-1"
                >
                  <Check size={14} /> Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Belum ada notifikasi baru.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-700/50">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => {
                        if (!notif.is_read) void markAsRead(notif.id);
                      }}
                      className={`relative w-full cursor-pointer p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-700/30 ${!notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                    >
                      {!notif.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                      )}
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium mb-1 truncate ${!notif.is_read ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 text-muted-foreground mt-2 font-medium">
                            {formatDistanceToNow(new Date(notif.created_at), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-2 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-slate-700 text-muted-foreground dark:hover:text-zinc-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
