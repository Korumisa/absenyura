import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { ModeToggle } from '@/components/ThemeToggle';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';

type NavItem = { label: string; to: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Info',
    items: [
      { label: 'Berita', to: '/berita' },
      { label: 'Kegiatan', to: '/kegiatan' },
      { label: 'Informasi Lomba', to: '/informasi-lomba' },
    ],
  },
  {
    label: 'Organisasi',
    items: [
      { label: 'Struktur Organisasi', to: '/struktur-organisasi' },
      { label: 'Program Kerja', to: '/program-kerja' },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Galeri', to: '/galeri' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { label: 'Open Recruitment', to: '/open-recruitment' },
    ],
  },
] as const;

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function BrandMark() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  return (
    <img
      src={profile?.logo_light_url || '/3.%20HM%20SDP.png'}
      alt="Logo"
      className="h-10 w-10 rounded-xl bg-white/70 p-1.5 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10"
    />
  );
}

export default function PublicNavbar() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const location = useLocation();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenGroup(null);
  }, [location.pathname, location.hash]);

  const activePath = useMemo(() => {
    if (location.pathname === '/') return '/';
    const match = NAV_ITEMS.find((i) => i.to === location.pathname);
    return match?.to ?? '';
  }, [location.pathname]);

  const activeGroup = useMemo(() => {
    if (!activePath) return '';
    const group = NAV_GROUPS.find((g) => g.items.some((x) => x.to === activePath));
    return group?.label ?? '';
  }, [activePath]);

  const loginCta = useMemo(() => {
    if (location.pathname === '/login') return { to: '/', label: 'Beranda' };
    return { to: '/login', label: 'Login' };
  }, [location.pathname]);

  const NavBlob = () => (
    <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-7 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/20 blur-md" />
  );

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-black/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/75"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark />
          <div className="hidden flex-col leading-tight md:flex">
            <div className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              {profile?.org_name ? profile.org_name : 'Profil belum diatur'}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-300">
              {profile?.campus_name ? profile.campus_name : 'Konten Website'}
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className={`relative text-[15px] font-medium text-slate-700 transition hover:text-[var(--public-primary)] dark:text-slate-200 dark:hover:text-white ${
              location.pathname === '/' ? 'text-[var(--public-primary)] dark:text-white' : ''
            }`}
          >
            {location.pathname === '/' ? <NavBlob /> : null}
            Beranda
          </Link>

          {NAV_GROUPS.map((g) => {
            const isActive = activeGroup === g.label;
            const isOpen = openGroup === g.label;
            return (
              <div
                key={g.label}
                className="relative"
                onMouseEnter={() => setOpenGroup(g.label)}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup((x) => (x === g.label ? null : g.label))}
                  className={`relative inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-700 transition hover:text-[var(--public-primary)] dark:text-slate-200 dark:hover:text-white ${
                    isActive ? 'text-[var(--public-primary)] dark:text-white' : ''
                  }`}
                  aria-expanded={isOpen}
                >
                  {isActive ? <NavBlob /> : null}
                  {g.label}
                  <ChevronDown size={16} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen ? (
                  <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
                    <div className="w-[260px] rounded-2xl border border-black/10 bg-white p-2 shadow-[0_22px_60px_-45px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_22px_60px_-45px_rgba(0,0,0,0.8)]">
                      {g.items.map((it) => {
                        const active = activePath === it.to;
                        return (
                          <Link
                            key={it.to}
                            to={it.to}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                            }`}
                          >
                            <span>{it.label}</span>
                            <span className="text-xs font-bold opacity-50">{active ? '•' : ''}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <ModeToggle />
          <Link
            to={loginCta.to}
            className="rounded-xl bg-[var(--public-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.35)] transition hover:brightness-110"
          >
            {loginCta.label}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-800 dark:text-slate-100 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 top-[4.25rem] flex max-h-[min(560px,calc(100vh-4.25rem))] w-full flex-col gap-6 overflow-y-auto border-t border-black/10 bg-white px-6 py-8 dark:border-white/10 dark:bg-zinc-950 md:hidden">
          <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900 active:text-[var(--public-primary)] dark:text-white">
            Beranda
          </Link>
          {NAV_GROUPS.map((g) => {
            const isOpen = openGroup === g.label;
            return (
              <div key={g.label} className="space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
                  onClick={() => setOpenGroup((x) => (x === g.label ? null : g.label))}
                  aria-expanded={isOpen}
                >
                  <span>{g.label}</span>
                  <ChevronDown size={20} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen ? (
                  <div className="grid gap-2 rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                    {g.items.map((it) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 active:text-[var(--public-primary)] dark:text-slate-200"
                      >
                        {it.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="h-px w-full bg-black/10 dark:bg-white/10" />
          <div className="flex items-center justify-between">
            <ModeToggle />
            <Link to={loginCta.to} className="rounded-xl bg-[var(--public-primary)] px-5 py-2.5 text-sm font-semibold text-white">
              {loginCta.label}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
