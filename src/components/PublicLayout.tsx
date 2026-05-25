import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';
import { useLocation } from 'react-router-dom';
import { loadCormorantDisplayFont } from '@/lib/loadFonts';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { mutate } = useSWRConfig();
  const { data: profile, isLoading: isLoadingProfile } = useSWR<PublicProfile | null>(
    '/public-site/profile',
    fetcher,
    { revalidateOnFocus: false },
  );
  const primary = profile?.primary_color || '#2563eb';
  const showBootOverlay = isLoadingProfile && !profile;

  React.useEffect(() => {
    loadCormorantDisplayFont();
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'public-prefetch-v1';
    if (window.sessionStorage.getItem(key) === '1') return;
    window.sessionStorage.setItem(key, '1');

    // Prefetch ringan — hindari membanjiri API (penting di NAT kampus / mobile)
    const urls = ['/public-site/profile', '/public-site/categories'];
    void Promise.allSettled(urls.map((url) => mutate(url, fetcher(url), { revalidate: false })));
  }, [mutate]);

  const orgLabel = profile?.org_name?.trim() || 'HM SDP';
  const metaDescription = profile?.hero_subtitle?.trim() || profile?.about_content?.trim()?.slice(0, 160);

  return (
    <div
      className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-200/60 selection:text-slate-900"
      style={{ ['--public-primary' as any]: primary }}
    >
      <PublicPageMeta
        title={orgLabel}
        description={metaDescription || undefined}
        path={location.pathname}
      />
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
