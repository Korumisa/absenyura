import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { mutate } = useSWRConfig();
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const primary = profile?.primary_color || '#2563eb';

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
    </div>
  );
}
