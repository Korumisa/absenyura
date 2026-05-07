import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import { useLocation } from 'react-router-dom';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const primary = profile?.primary_color || '#2563eb';
  const location = useLocation();
  const showChat = location.pathname !== '/login';

  return (
    <div
      className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-200/60 selection:text-slate-900 dark:bg-zinc-950 dark:text-slate-100"
      style={{ ['--public-primary' as any]: primary }}
    >
      <PublicNavbar />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
      <PublicFooter />
      {showChat ? (
        <a
          href="https://t.me/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Telegram"
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--public-primary)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.35)] ring-1 ring-black/10 transition hover:brightness-110 dark:ring-white/10"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9.04 15.56 8.87 20c.45 0 .65-.2.89-.44l2.14-2.05 4.43 3.24c.81.45 1.39.21 1.6-.75l2.9-13.56v-.01c.26-1.2-.43-1.67-1.22-1.38L2.5 9.1c-1.18.46-1.16 1.13-.2 1.43l4.69 1.46 10.9-6.86c.51-.33.98-.15.6.18l-8.85 8.25z" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
