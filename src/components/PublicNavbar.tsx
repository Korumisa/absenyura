import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import { AnimatePresence, motion } from 'framer-motion';

type NavItem = { label: string; to: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Info',
    items: [
      { label: 'Informasi Umum', to: '/informasi' },
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
  const src = profile?.logo_light_url || profile?.logo_dark_url || '/3.%20HM%20SDP.png';
  return (
    <img
      src={src}
      alt="Logo"
      className="h-10 w-10 rounded-xl bg-white p-1.5 ring-1 ring-black/10"
    />
  );
}

export default function PublicNavbar() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, isLoading: isLoadingProfile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
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

  return (
    <nav
      className="fixed left-0 top-0 z-50 w-full border-b border-black/10 bg-white/85 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark />
          <div className="hidden flex-col leading-tight md:flex">
            <div className="text-sm font-extrabold tracking-tight text-slate-900">
              {isLoadingProfile ? 'Memuat...' : profile?.org_name ? profile.org_name : 'Profil belum diatur'}
            </div>
            <div className="text-xs font-medium text-slate-600">
              {isLoadingProfile ? '' : profile?.campus_name ? profile.campus_name : 'Konten Website'}
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className={`rounded-full px-4 py-2 text-[15px] font-semibold transition ${
              location.pathname === '/'
                ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
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
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-semibold transition ${
                    isActive
                      ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  aria-expanded={isOpen}
                >
                  {g.label}
                  <ChevronDown size={16} className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen ? (
                  <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
                    <div className="w-[260px] rounded-2xl border border-black/10 bg-white p-2 shadow-[0_22px_60px_-45px_rgba(15,23,42,0.5)]">
                      {g.items.map((it) => {
                        const active = activePath === it.to;
                        return (
                          <Link
                            key={it.to}
                            to={it.to}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]'
                                : 'text-slate-700 hover:bg-slate-50'
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
          <Link
            to={loginCta.to}
            className="rounded-full bg-[var(--public-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.35)] transition hover:brightness-110"
          >
            {loginCta.label}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-800 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <AnimatePresence initial={false} mode="wait">
            {isMobileMenuOpen ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, rotate: -90, scale: 0.92 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.92 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="inline-flex"
              >
                <X size={26} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ opacity: 0, rotate: 90, scale: 0.92 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -90, scale: 0.92 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="inline-flex"
              >
                <Menu size={26} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }}
            className="absolute left-0 top-[4.25rem] flex max-h-[min(560px,calc(100vh-4.25rem))] w-full flex-col gap-6 overflow-y-auto border-t border-black/10 bg-white px-4 py-8 sm:px-6 md:hidden"
          >
            <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
              Beranda
            </Link>
            {NAV_GROUPS.map((g) => {
              const isOpen = openGroup === g.label;
              return (
                <div key={g.label} className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-lg font-semibold tracking-tight text-slate-900"
                    onClick={() => setOpenGroup((x) => (x === g.label ? null : g.label))}
                    aria-expanded={isOpen}
                  >
                    <span>{g.label}</span>
                    <ChevronDown size={20} className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-2 rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur">
                          {g.items.map((it) => (
                            <Link
                              key={it.to}
                              to={it.to}
                              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700"
                            >
                              {it.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
            <div className="h-px w-full bg-black/10" />
            <div className="flex items-center justify-between">
              <Link to={loginCta.to} className="rounded-full bg-[var(--public-primary)] px-5 py-2.5 text-sm font-semibold text-white">
                {loginCta.label}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
