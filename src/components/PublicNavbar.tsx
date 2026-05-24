import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { fadeTransition } from '@/lib/motionPresets';

type NavItem = { label: string; to: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Info',
    items: [
      { label: 'Berita', to: '/berita' },
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
    items: [{ label: 'Galeri', to: '/galeri' }],
  },
  {
    label: 'Recruitment',
    items: [{ label: 'Open Recruitment', to: '/open-recruitment' }],
  },
] as const;

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** [IA] #12 — menu mobile datar, tanpa accordion bertingkat */
const MOBILE_NAV: NavItem[] = [
  { label: 'Beranda', to: '/' },
  { label: 'Berita', to: '/berita' },
  { label: 'Informasi Umum', to: '/informasi' },
  { label: 'Informasi Lomba', to: '/informasi-lomba' },
  { label: 'Struktur Organisasi', to: '/struktur-organisasi' },
  { label: 'Program Kerja', to: '/program-kerja' },
  { label: 'Galeri', to: '/galeri' },
  { label: 'Open Recruitment', to: '/open-recruitment' },
];

function BrandMark() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const src = profile?.logo_light_url || profile?.logo_dark_url || '/3.%20HM%20SDP.png';
  return (
    <img src={src} alt="Logo organisasi" className="h-10 w-10 object-contain" />
  );
}

export default function PublicNavbar() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, isLoading: isLoadingProfile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const location = useLocation();
  const reducedMotion = useReducedMotion();

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

  const loginCta = useMemo(() => ({ to: '/login', label: 'Login' }), []);

  return (
    <nav className="fixed left-0 top-0 z-50 w-full border-b border-black/10 bg-white/85 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex min-h-11 min-w-11 items-center gap-3">
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
            className={`min-h-11 rounded-full px-4 py-2 text-[15px] font-semibold transition ${
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
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-semibold transition ${
                    isActive
                      ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  aria-expanded={isOpen}
                >
                  {g.label}
                  <ChevronDown size={16} className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
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
                            className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{it.label}</span>
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
            className="min-h-11 rounded-full bg-[var(--public-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.35)] transition hover:brightness-110"
          >
            {loginCta.label}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-800 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="public-mobile-nav"
          aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {reducedMotion ? (
            isMobileMenuOpen ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />
          ) : (
            <AnimatePresence initial={false} mode="wait">
              {isMobileMenuOpen ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={fadeTransition(false)}
                  className="inline-flex"
                >
                  <X size={26} aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={fadeTransition(false)}
                  className="inline-flex"
                >
                  <Menu size={26} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </button>
      </div>

      {reducedMotion ? (
        isMobileMenuOpen ? (
          <div
            id="public-mobile-nav"
            className="absolute left-0 top-[4.25rem] flex max-h-[min(70vh,calc(100vh-4.25rem))] w-full flex-col gap-1 overflow-y-auto border-t border-black/10 bg-white px-2 py-3 shadow-lg md:hidden"
            role="dialog"
            aria-label="Menu navigasi"
          >
            {MOBILE_NAV.map((item) => {
              const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-h-11 items-center rounded-xl px-4 text-base font-semibold ${
                    active ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]' : 'text-slate-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-black/10" />
            <Link
              to={loginCta.to}
              className="mx-2 flex min-h-11 items-center justify-center rounded-full bg-[var(--public-primary)] px-5 text-sm font-semibold text-white"
            >
              {loginCta.label}
            </Link>
          </div>
        ) : null
      ) : (
        <AnimatePresence>
          {isMobileMenuOpen ? (
            <motion.div
              id="public-mobile-nav"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={fadeTransition(false, 0.2)}
              className="absolute left-0 top-[4.25rem] flex max-h-[min(70vh,calc(100vh-4.25rem))] w-full flex-col gap-1 overflow-y-auto border-t border-black/10 bg-white px-2 py-3 shadow-lg md:hidden"
              role="dialog"
              aria-label="Menu navigasi"
            >
              {MOBILE_NAV.map((item) => {
                const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex min-h-11 items-center rounded-xl px-4 text-base font-semibold ${
                      active ? 'bg-[var(--public-primary)]/10 text-[var(--public-primary)]' : 'text-slate-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-black/10" />
              <Link
                to={loginCta.to}
                className="mx-2 flex min-h-11 items-center justify-center rounded-full bg-[var(--public-primary)] px-5 text-sm font-semibold text-white"
              >
                {loginCta.label}
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </nav>
  );
}
