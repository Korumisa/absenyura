import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';
import { useLocation } from 'react-router-dom';
import { loadCormorantDisplayFont } from '@/lib/perf/loadFonts';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';
import { isCloudinaryUrl, optimizeCloudinaryUrl } from '@/lib/media/cloudinaryImage';
import { PublicSiteDataProvider } from '@/components/PublicSiteDataContext';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const fetcher = React.useCallback((url: string) => api.get(url).then((r) => r.data.data), []);
  const { mutate } = useSWRConfig();
  const {
    data: profile = null,
    isLoading: loading,
    error,
  } = useSWR<PublicProfile | null, Error>('/public-site/profile', fetcher, {
    revalidateOnFocus: false,
  });
  const primary = profile?.primary_color || '#2563eb';

  React.useEffect(() => {
    loadCormorantDisplayFont();
  }, []);

  React.useEffect(() => {
    const raw = profile?.home_image_url;
    if (!raw) return;
    const href = optimizeCloudinaryUrl(ensureHttpsUrl(raw), { width: 828 });
    const existing = document.querySelector('link[data-public-hero-preload]');
    if (existing?.getAttribute('href') === href) return;
    existing?.remove();
    if (document.head.querySelector(`link[rel="preload"][href="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.referrerPolicy = 'no-referrer';
    link.setAttribute('data-public-hero-preload', '1');
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [profile?.home_image_url]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'public-prefetch-v1';
    if (window.sessionStorage.getItem(key) === '1') return;
    window.sessionStorage.setItem(key, '1');

    const urls = ['/public-site/profile', '/public-site/categories'];
    void Promise.allSettled(urls.map((url) => mutate(url, fetcher(url), { revalidate: false })));
  }, [mutate, fetcher]);

  const orgLabel = profile?.org_name?.trim() || 'HM SDP';
  const metaDescription =
    profile?.hero_subtitle?.trim() || profile?.about_content?.trim()?.slice(0, 160);

  return (
    <PublicSiteDataProvider profile={profile} loading={loading} error={error ?? null}>
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
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 rounded-lg bg-brand px-4 py-2 z-50"
        >
          Lewati ke konten utama
        </a>
        <PublicNavbar />
        <main id="main-content" className="flex flex-1 flex-col pt-[4.25rem]">
          {children}
        </main>
        <PublicFooter />
      </div>
    </PublicSiteDataProvider>
  );
}
