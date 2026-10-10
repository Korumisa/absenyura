import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  Menu,
  X,
  Bell,
  ChevronRight,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { UserDropdown } from './UserDropdown';
import { ThemeToggle } from './ThemeToggle';

const NotificationMenu = lazy(() =>
  import('./NotificationMenu').then((m) => ({ default: m.NotificationMenu }))
);
import { Button } from '@/components/ui/button';
import { AdminRouteTransition } from '@/components/admin/AdminRouteTransition';
import PageSkeleton from '@/components/PageSkeleton';
import { InnerRouteErrorBoundary } from '@/components/ErrorBoundary';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { cn } from '@/lib/utils/utils';
import {
  ADMIN_NAV_FOOTER,
  type AdminNavItem,
  findActiveNav,
  getNavSectionsForRole,
  isNavItemActive,
} from '@/components/admin/adminNav';

const COLLAPSE_KEY = 'admin.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.name : undefined}
      title={collapsed ? item.name : undefined}
      onClick={onNavigate}
      className={cn(
        'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'lg:justify-center lg:px-0',
        active
          ? 'bg-brand/10 text-brand dark:bg-brand/20'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {active ? (
        <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand" />
      ) : null}
      <Icon
        size={18}
        className={cn(
          'shrink-0',
          active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span className={cn('truncate', collapsed && 'lg:sr-only')}>{item.name}</span>
    </Link>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const { user, isAuthenticated, hasHydrated, sessionStatus } = useAuthStore();
  const location = useLocation();
  const shouldShowSkeleton = !hasHydrated || (isAuthenticated && sessionStatus !== 'verified');

  const sidebarRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useDialogA11y(sidebarOpen, closeSidebar, {
    containerRef: sidebarRef,
    triggerRef: hamburgerRef,
  });

  const sections = useMemo(() => getNavSectionsForRole(user?.role), [user?.role]);
  const activeNav = useMemo(() => findActiveNav(location.pathname), [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* storage penuh / mode privat */
      }
      return next;
    });
  }, []);

  if (shouldShowSkeleton) {
    return <PageSkeleton />;
  }

  return (
    <div className="admin-theme flex h-dvh overflow-hidden bg-sidebar font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 rounded-lg bg-brand px-4 py-2 text-brand-foreground z-50"
      >
        Lewati ke konten utama
      </a>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          className="fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        ref={sidebarRef}
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen ? true : undefined}
        aria-label="Sidebar navigasi"
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-card transition-[transform,width] duration-300 ease-in-out lg:translate-x-0',
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          sidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4',
            collapsed && 'lg:justify-center lg:px-2'
          )}
        >
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/logo-hmsdp.webp"
              alt="Logo HMSDP"
              className="size-9 shrink-0 rounded-lg bg-background/70 p-1.5 ring-1 ring-border"
            />
            <span className={cn('min-w-0 leading-tight', collapsed && 'lg:hidden')}>
              <span className="block truncate text-base font-bold text-foreground">E-Absensi</span>
              <span className="block truncate text-xs text-muted-foreground">HMSDP Undiksha</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground lg:hidden"
            onClick={closeSidebar}
            aria-label="Tutup sidebar"
          >
            <X size={22} />
          </Button>
        </div>

        <nav
          aria-label="Navigasi utama"
          className="scrollbar-hide flex-1 space-y-5 overflow-y-auto px-3 py-4"
        >
          {sections.map((section) => (
            <div key={section.id} className="space-y-1">
              <p
                className={cn(
                  'px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70',
                  collapsed && 'lg:sr-only'
                )}
              >
                {section.label}
              </p>
              {collapsed ? (
                <div
                  aria-hidden
                  className="mx-auto mb-2 hidden h-px w-8 bg-sidebar-border lg:block"
                />
              ) : null}
              {section.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  active={isNavItemActive(item, location.pathname)}
                  collapsed={collapsed}
                  onNavigate={closeSidebar}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-3">
          <SidebarLink
            item={ADMIN_NAV_FOOTER}
            active={isNavItemActive(ADMIN_NAV_FOOTER, location.pathname)}
            collapsed={collapsed}
            onNavigate={closeSidebar}
          />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            className={cn(
              'hidden min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex',
              collapsed && 'lg:justify-center lg:px-0'
            )}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className={cn(collapsed && 'sr-only')}>Ciutkan</span>
          </button>
        </div>
      </aside>

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out',
          collapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'
        )}
      >
        <header className="z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-card/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              ref={hamburgerRef}
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka sidebar"
            >
              <Menu size={22} />
            </Button>
            <nav aria-label="Lokasi halaman" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                <li className="hidden shrink-0 text-muted-foreground sm:block">
                  {activeNav?.section.label ?? 'Panel Admin'}
                </li>
                {activeNav ? (
                  <>
                    <li aria-hidden className="hidden text-muted-foreground/50 sm:block">
                      <ChevronRight size={14} />
                    </li>
                    <li className="truncate font-semibold text-foreground" aria-current="page">
                      {activeNav.item.name}
                    </li>
                  </>
                ) : (
                  <li className="truncate font-semibold text-foreground sm:hidden">E-Absensi</li>
                )}
              </ol>
            </nav>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden text-muted-foreground md:inline-flex"
            >
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} className="mr-1.5" />
                Lihat situs
              </a>
            </Button>
            <ThemeToggle />
            <Suspense
              fallback={
                <Button variant="ghost" size="icon" aria-hidden disabled>
                  <Bell size={20} className="text-muted-foreground opacity-60" />
                </Button>
              }
            >
              <NotificationMenu />
            </Suspense>
            <UserDropdown />
          </div>
        </header>

        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto bg-sidebar pb-6 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <AdminRouteTransition>
            <InnerRouteErrorBoundary>
              <Outlet />
            </InnerRouteErrorBoundary>
          </AdminRouteTransition>
        </main>
      </div>
    </div>
  );
}
