import React from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile } from '@/types/publicSite';
import { Instagram, Music2, Youtube } from 'lucide-react';

export default function PublicFooter() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });

  const orgName = profile?.org_name ?? '';
  const campusName = profile?.campus_name ?? '';
  const email = profile?.email ?? null;
  const phone = profile?.phone ?? null;
  const address = profile?.address ?? null;
  const kabinetName = profile?.kabinet_name ?? '';
  const footerTagline = profile?.footer_tagline ?? '';
  const instagramUrl = profile?.instagram_url ?? '';
  const tiktokUrl = profile?.tiktok_url ?? '';
  const youtubeUrl = profile?.youtube_url ?? '';

  return (
    <footer className="relative border-t border-black/10 bg-white pb-10 pt-14 text-slate-700 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_15%_25%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.10),transparent_60%)] dark:opacity-50" />
      <div className="pointer-events-none absolute left-6 top-0 -translate-y-1/2 -rotate-6">
        <div className="relative">
          <div className="absolute -inset-6 rounded-full bg-[var(--public-primary)]/14 blur-2xl" />
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.55)] backdrop-blur dark:bg-white/10 dark:ring-white/10 dark:shadow-[0_20px_55px_-45px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.24),transparent_60%),radial-gradient(circle_at_75%_35%,rgba(56,189,248,0.18),transparent_60%),linear-gradient(135deg,rgba(15,23,42,0.08),transparent)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.24),transparent_60%),radial-gradient(circle_at_75%_35%,rgba(56,189,248,0.18),transparent_60%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-6 top-0 -translate-y-1/2 rotate-6">
        <div className="relative">
          <div className="absolute -inset-6 rounded-full bg-sky-400/12 blur-2xl" />
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.55)] backdrop-blur dark:bg-white/10 dark:ring-white/10 dark:shadow-[0_20px_55px_-45px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(37,99,235,0.20),transparent_60%),linear-gradient(135deg,rgba(15,23,42,0.08),transparent)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(37,99,235,0.20),transparent_60%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {orgName || 'Profil belum diatur'}
              <div className="text-slate-500 dark:text-slate-300">{campusName || 'Silakan atur melalui Konten Website'}</div>
            </div>
            {footerTagline ? (
              <div className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{footerTagline}</div>
            ) : (
              <div className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Deskripsi singkat belum diatur.
              </div>
            )}

            {(instagramUrl || tiktokUrl || youtubeUrl) ? (
              <div className="mt-5 flex items-center gap-3">
                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-[var(--public-primary)]/30 hover:text-[var(--public-primary)] dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
                    aria-label="Instagram"
                  >
                    <Instagram size={18} />
                  </a>
                ) : null}
                {tiktokUrl ? (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-[var(--public-primary)]/30 hover:text-[var(--public-primary)] dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
                    aria-label="TikTok"
                  >
                    <Music2 size={18} />
                  </a>
                ) : null}
                {youtubeUrl ? (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-[var(--public-primary)]/30 hover:text-[var(--public-primary)] dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
                    aria-label="YouTube"
                  >
                    <Youtube size={18} />
                  </a>
                ) : null}
                <div className="relative ml-1 hidden h-2 w-20 overflow-hidden rounded-full bg-black/5 dark:bg-white/10 sm:block">
                  <div className="absolute inset-0 w-1/2 animate-pulse rounded-full bg-[var(--public-primary)]/30" />
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Quick Links</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-[var(--public-primary)]">Home</Link></li>
              <li><Link to="/berita" className="hover:text-[var(--public-primary)]">Berita</Link></li>
              <li><Link to="/kegiatan" className="hover:text-[var(--public-primary)]">Kegiatan</Link></li>
              <li><Link to="/struktur-organisasi" className="hover:text-[var(--public-primary)]">Struktur Organisasi</Link></li>
              <li><Link to="/program-kerja" className="hover:text-[var(--public-primary)]">Program Kerja</Link></li>
              <li><Link to="/informasi-lomba" className="hover:text-[var(--public-primary)]">Informasi Lomba</Link></li>
              <li><Link to="/galeri" className="hover:text-[var(--public-primary)]">Galeri</Link></li>
              <li><Link to="/open-recruitment" className="hover:text-[var(--public-primary)]">Open Recruitment</Link></li>
            </ul>
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Terkait</div>
            <ul className="space-y-2 text-sm">
              <li><a href="https://undiksha.ac.id/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--public-primary)]">UNDIKSHA</a></li>
              <li><a href="https://sdp.undiksha.ac.id/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--public-primary)]">SDP Undiksha</a></li>
            </ul>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Contact Person</div>
              {phone ? (
                <a href={`tel:${phone}`} className="text-sm text-slate-700 hover:text-[var(--public-primary)] dark:text-slate-200">{phone}</a>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">Belum diatur</div>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Alamat</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">{address ?? 'Belum diatur'}</div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Email</div>
              {email ? (
                <a href={`mailto:${email}`} className="text-sm text-slate-700 hover:text-[var(--public-primary)] dark:text-slate-200">{email}</a>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">Belum diatur</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-black/10 pt-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          © {new Date().getFullYear()} {kabinetName ? kabinetName : orgName}
        </div>
      </div>
    </footer>
  );
}
