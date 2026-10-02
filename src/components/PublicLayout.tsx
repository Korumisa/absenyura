import { useCallback, useEffect, type CSSProperties, type ReactNode } from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import { upsertScriptJsonLd } from '@/components/public/PublicPageMeta';
import { loadCormorantDisplayFont } from '@/lib/perf/loadFonts';
import { PublicSiteDataProvider } from '@/components/PublicSiteDataContext';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const fetcher = useCallback((url: string) => api.get(url).then((r) => r.data.data), []);
  const { mutate } = useSWRConfig();
  const {
    data: profile = null,
    isLoading: loading,
    error,
  } = useSWR<PublicProfile | null, Error>('/public-site/profile', fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
    errorRetryInterval: 1200,
    revalidateOnReconnect: true,
    onErrorRetry: (err, _key, _config, revalidate, revalidateOpts) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        return;
      }
      void revalidate(revalidateOpts);
    },
  });
  const primary = profile?.primary_color || '#2563eb';

  useEffect(() => {
    loadCormorantDisplayFont();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'public-prefetch-v1';
    if (window.sessionStorage.getItem(key) === '1') return;
    window.sessionStorage.setItem(key, '1');

    const urls = ['/public-site/profile', '/public-site/categories'];
    void Promise.allSettled(urls.map((url) => mutate(url, fetcher(url), { revalidate: false })));
  }, [mutate, fetcher]);

  const orgLabel = profile?.org_name?.trim() || 'HM SDP Undiksha';
  const siteUrl = 'https://hmsdp.vercel.app';

  useEffect(() => {
    const name = orgLabel || 'HM SDP Undiksha';
    const descriptionText =
      profile?.about_content?.trim().slice(0, 200) ||
      `Portal informasi dan sistem absensi ${name}.`;
    const logoUrl = `${siteUrl}/logo-hmsdp.png`;
    const socialUrls: string[] = [];
    if (profile?.instagram_url) socialUrls.push(profile.instagram_url);
    if (profile?.youtube_url) socialUrls.push(profile.youtube_url);
    if (profile?.tiktok_url) socialUrls.push(profile.tiktok_url);
    if (profile?.phone) {
      const digits = String(profile.phone).replace(/\D+/g, '');
      const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
      if (normalized) socialUrls.push(`https://wa.me/${normalized}`);
    }
    upsertScriptJsonLd('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url: siteUrl,
      logo: logoUrl,
      description: descriptionText,
      ...(socialUrls.length ? { sameAs: socialUrls } : {}),
    });
    return () => {
      upsertScriptJsonLd('organization', null);
    };
  }, [profile, orgLabel]);

  return (
    <PublicSiteDataProvider profile={profile} loading={loading} error={error ?? null}>
      <div
        className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-200/60 selection:text-slate-900"
        style={{ '--public-primary': primary } as CSSProperties}
      >
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
