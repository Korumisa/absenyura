import React from 'react';
import { Link } from 'react-router-dom';
import { usePublicSiteData } from '@/components/PublicSiteDataContext';
import { Instagram, Music2, Youtube } from 'lucide-react';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';

export default function PublicFooter() {
  const { profile } = usePublicSiteData();

  const orgName = profile?.org_name ?? '';
  const campusName = profile?.campus_name ?? '';
  const email = profile?.email ?? null;
  const phone = profile?.phone ?? null;
  const address = profile?.address ?? null;
  const kabinetName = profile?.kabinet_name ?? '';
  const footerTagline = profile?.footer_tagline ?? '';
  const instagramUrl = ensureHttpsUrl(profile?.instagram_url);
  const tiktokUrl = ensureHttpsUrl(profile?.tiktok_url);
  const youtubeUrl = ensureHttpsUrl(profile?.youtube_url);

  return (
    <footer className="relative border-t border-black/10 bg-slate-50 pb-10 pt-14 text-slate-700">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--public-primary)]/45 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="text-sm font-extrabold tracking-tight text-slate-900">
              {orgName || 'Profil belum diatur'}
              <div className="mt-1 font-medium text-muted-foreground">
                {campusName || 'Silakan atur melalui Konten Website'}
              </div>
            </div>
            {footerTagline ? (
              <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {footerTagline}
              </div>
            ) : (
              <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Deskripsi singkat belum diatur.
              </div>
            )}

            {instagramUrl || tiktokUrl || youtubeUrl ? (
              <div className="mt-5 flex items-center gap-3">
                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-[var(--public-primary)]/35 hover:text-[var(--public-primary)]"
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
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-[var(--public-primary)]/35 hover:text-[var(--public-primary)]"
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
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-[var(--public-primary)]/35 hover:text-[var(--public-primary)]"
                    aria-label="YouTube"
                  >
                    <Youtube size={18} />
                  </a>
                ) : null}
                <div className="relative ml-1 hidden h-2 w-20 overflow-hidden rounded-full bg-black/5 sm:block">
                  <div className="absolute inset-0 w-1/2 animate-pulse rounded-full bg-[var(--public-primary)]/30" />
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-4 text-sm font-extrabold tracking-tight text-slate-900">
              Quick Links
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-[var(--public-primary)]">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/berita" className="hover:text-[var(--public-primary)]">
                  Berita
                </Link>
              </li>
              <li>
                <Link to="/informasi" className="hover:text-[var(--public-primary)]">
                  Informasi
                </Link>
              </li>
              <li>
                <Link to="/struktur-organisasi" className="hover:text-[var(--public-primary)]">
                  Struktur Organisasi
                </Link>
              </li>
              <li>
                <Link to="/program-kerja" className="hover:text-[var(--public-primary)]">
                  Program Kerja
                </Link>
              </li>
              <li>
                <Link to="/informasi-lomba" className="hover:text-[var(--public-primary)]">
                  Informasi Lomba
                </Link>
              </li>
              <li>
                <Link to="/galeri" className="hover:text-[var(--public-primary)]">
                  Galeri
                </Link>
              </li>
              <li>
                <Link to="/open-recruitment" className="hover:text-[var(--public-primary)]">
                  Open Recruitment
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-extrabold tracking-tight text-slate-900">
                Contact Person
              </div>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="text-sm text-slate-700 hover:text-[var(--public-primary)]"
                >
                  {phone}
                </a>
              ) : (
                <div className="text-sm text-muted-foreground">Belum diatur</div>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-extrabold tracking-tight text-slate-900">
                Alamat
              </div>
              <div className="text-sm text-muted-foreground">{address ?? 'Belum diatur'}</div>
            </div>
            <div>
              <div className="mb-2 text-sm font-extrabold tracking-tight text-slate-900">Email</div>
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-slate-700 hover:text-[var(--public-primary)]"
                >
                  {email}
                </a>
              ) : (
                <div className="text-sm text-muted-foreground">Belum diatur</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-black/10 pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {kabinetName ? kabinetName : orgName}
        </div>
      </div>
    </footer>
  );
}
