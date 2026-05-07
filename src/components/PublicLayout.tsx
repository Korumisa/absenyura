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
  const rawPhone = String(profile?.phone ?? '').trim();
  const digits = rawPhone.replace(/\D/g, '');
  const waNumber = digits ? (digits.startsWith('0') ? `62${digits.slice(1)}` : digits) : '';
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : '';

  return (
    <div
      className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-blue-200/60 selection:text-slate-900 dark:bg-zinc-950 dark:text-slate-100"
      style={{ ['--public-primary' as any]: primary }}
    >
      <PublicNavbar />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
      <PublicFooter />
      {showChat && waUrl ? (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp"
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--public-primary)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.35)] ring-1 ring-black/10 transition hover:brightness-110 dark:ring-white/10"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.52 3.48A11.92 11.92 0 0 0 12.03 0C5.4 0 .01 5.38 0 12c0 2.12.55 4.18 1.6 6L0 24l6.2-1.63A12 12 0 0 0 12.03 24C18.65 24 24 18.62 24 12c0-3.2-1.25-6.2-3.5-8.52ZM12.03 22a9.97 9.97 0 0 1-5.1-1.4l-.36-.22-3.68.97.98-3.59-.24-.37A9.96 9.96 0 0 1 2.03 12c0-5.51 4.49-10 10-10 2.67 0 5.18 1.04 7.07 2.93A9.92 9.92 0 0 1 22.03 12c0 5.51-4.49 10-10 10Zm5.78-7.46c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.27-.19.22-.39.24-.71.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.39.48-.58.16-.19.22-.32.33-.54.11-.22.05-.4-.03-.56-.08-.16-.74-1.78-1.02-2.44-.27-.65-.54-.56-.74-.57h-.63c-.22 0-.56.08-.86.4-.3.32-1.13 1.1-1.13 2.68 0 1.58 1.16 3.11 1.32 3.32.16.22 2.29 3.5 5.55 4.9.78.34 1.39.54 1.86.69.78.25 1.5.22 2.06.13.63-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.14-.3-.22-.62-.38Z" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
