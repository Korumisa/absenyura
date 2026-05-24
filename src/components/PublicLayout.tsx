import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { mutate } = useSWRConfig();
  const { data: profile, isLoading: isLoadingProfile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const primary = profile?.primary_color || '#2563eb';
  const [showBootOverlay, setShowBootOverlay] = React.useState(false);
  const bootShownAt = React.useRef<number | null>(null);

  // [UX] overlay hanya saat profil pertama kali load — prefetch tidak memblokir UI
  React.useEffect(() => {
    const needsOverlay = isLoadingProfile && !profile;
    if (needsOverlay) {
      if (!showBootOverlay) {
        bootShownAt.current = Date.now();
        setShowBootOverlay(true);
      }
      return;
    }
    if (!showBootOverlay) return;
    const elapsed = Date.now() - (bootShownAt.current ?? Date.now());
    const t = window.setTimeout(() => setShowBootOverlay(false), Math.max(0, 150 - elapsed));
    return () => window.clearTimeout(t);
  }, [isLoadingProfile, profile, showBootOverlay]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'public-prefetch-v1';
    if (window.sessionStorage.getItem(key) === '1') return;
    window.sessionStorage.setItem(key, '1');

    // Prefetch ringan — hindari membanjiri API (penting di NAT kampus / mobile)
    const urls = ['/public-site/profile', '/public-site/categories'];
    void Promise.allSettled(urls.map((url) => mutate(url, fetcher(url), { revalidate: false })));
  }, [mutate]);

  return (
    <div
      className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-200/60 selection:text-slate-900"
      style={{ ['--public-primary' as any]: primary }}
    >
      <a
        href="#public-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--public-primary)]"
      >
        Lewati ke konten utama
      </a>
      <PublicNavbar />
      <main id="public-main" className="flex flex-1 flex-col pt-[4.25rem]">
        {children}
      </main>
      <PublicFooter />
      <PublicLoadingOverlay show={showBootOverlay} label="Memuat..." className="z-[95] bg-white/35 backdrop-blur-xl" />
    </div>
  );
}
