import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicPost, PublicProfile, PublicProgram, PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';

function BrandMark({ className, src }: { className?: string; src: string }) {
  return <img className={className} src={src} alt="Logo" />;
}

export default function PublicHome() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const { data: programs = [], isLoading: isLoadingPrograms } = useSWR<PublicProgram[]>('/public-site/programs', fetcher, { revalidateOnFocus: false });
  const { data: structure = [], isLoading: isLoadingStructure } = useSWR<PublicStructureGroup[]>('/public-site/structure', fetcher, { revalidateOnFocus: false });
  const { data: latest, isLoading: isLoadingLatest } = useSWR<{ items: PublicPost[] }>(
    '/public-site/posts?type=BERITA&page=1&pageSize=3',
    (url) => api.get(url).then((r) => r.data.data),
    { revalidateOnFocus: false }
  );

  const orgName = profile?.org_name ?? '';
  const campusName = profile?.campus_name ?? '';
  const kabinetName = profile?.kabinet_name ?? '';
  const kabinetPeriod = profile?.kabinet_period ?? '';
  const heroSubtitle = profile?.hero_subtitle ?? '';
  const youtubeEmbedUrl = profile?.youtube_embed_url ?? '';
  const aboutTitle = profile?.about_title ?? '';
  const aboutContent = profile?.about_content ?? '';
  const aboutParagraphs = aboutContent.split('\n').map((x) => x.trim()).filter(Boolean);

  const logoSrc = profile?.logo_light_url || '/3.%20HM%20SDP.png';
  const posts = latest?.items ?? [];

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_50%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_55%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.16),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.85))]">
        <PublicEnter className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="flex items-start gap-6">
            <BrandMark className="h-20 w-20 shrink-0 rounded-2xl bg-white/70 p-2 shadow-sm ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10" src={logoSrc} />
            <div>
              <div className="font-display text-4xl italic tracking-tight text-slate-900 dark:text-white md:text-5xl">Kabinet</div>
              <div className="mt-1 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-7xl">
                {kabinetName}
              </div>
              {kabinetPeriod ? <div className="mt-2 text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300">{kabinetPeriod}</div> : null}
              <div className="mt-5 max-w-md text-sm font-medium text-slate-700 dark:text-slate-200 md:text-base">
                {orgName}
                <div className="text-slate-500 dark:text-slate-300">{campusName}</div>
              </div>
              {heroSubtitle ? <div className="mt-4 max-w-xl text-sm text-slate-600 dark:text-slate-300 md:text-base">{heroSubtitle}</div> : null}

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/struktur-organisasi"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--public-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110"
                >
                  Struktur Organisasi
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/berita"
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Berita Terbaru
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-black/5 to-transparent dark:from-white/10" />
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_28px_70px_-50px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_28px_70px_-50px_rgba(0,0,0,0.6)]">
              <div className="relative h-[280px] w-full bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.22),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.18),transparent_60%),linear-gradient(135deg,rgba(15,23,42,0.06),rgba(15,23,42,0.02))] md:h-[360px] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.26),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.22),transparent_60%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
                <div className="absolute left-8 top-8 h-28 w-28 rounded-full bg-[var(--public-primary)]/20 blur-2xl" />
                <div className="absolute bottom-10 right-10 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl" />
                <div className="absolute bottom-7 left-7 rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
                    {orgName || campusName ? `${orgName || 'Organisasi'} • ${campusName || 'Kampus'}` : 'Profil belum diatur'}
                  </div>
                  <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {kabinetName ? `Kabinet ${kabinetName}` : 'Konten publik belum diatur'}
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {heroSubtitle ? heroSubtitle : 'Admin dapat mengatur profil, struktur, program kerja, berita, dan galeri dari menu Konten Website.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PublicEnter>
      </section>

      <section className="relative overflow-hidden bg-white dark:bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.10),transparent_60%)] opacity-70 dark:opacity-50" />
        <PublicReveal className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
          <div className="text-slate-800 dark:text-slate-100">
            <div className="mb-4 font-display text-3xl italic tracking-tight md:text-4xl">{aboutTitle || 'Tentang'}</div>
            {aboutParagraphs.length ? (
              <div className="space-y-5 text-[17px] leading-relaxed text-slate-700 dark:text-slate-300">
                {aboutParagraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                Konten “Tentang” belum diatur. Admin bisa isi dari menu Konten Website.
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_22px_56px_-48px_rgba(0,0,0,0.6)]">
            <div className="aspect-video w-full">
              {youtubeEmbedUrl ? (
                <iframe
                  className="h-full w-full"
                  src={youtubeEmbedUrl}
                  title="Video Profil"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.22),transparent_58%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.14),transparent_60%),linear-gradient(135deg,rgba(15,23,42,0.06),rgba(15,23,42,0.02))] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(37,99,235,0.22),transparent_58%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.14),transparent_60%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
                  <div className="rounded-xl border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    Video profil belum diatur
                  </div>
                </div>
              )}
            </div>
          </div>
        </PublicReveal>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="pointer-events-none absolute left-0 top-0 -translate-y-1/2">
            <div className="h-16 w-16 rounded-full bg-[var(--public-primary)]/14 blur-2xl" />
          </div>
          <div className="pointer-events-none absolute right-0 top-0 -translate-y-1/2">
            <div className="h-16 w-16 rounded-full bg-sky-400/12 blur-2xl" />
          </div>
          <div className="relative h-10 w-full">
            <div className="absolute left-1/2 top-1/2 h-10 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/18 blur-2xl" />
            <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/70" />
          </div>
        </div>
      </section>

      <section className="relative bg-white py-20 dark:bg-zinc-950">
        <PublicReveal className="mx-auto max-w-7xl px-6 text-center">
          <div className="pointer-events-none absolute left-0 top-12 hidden md:block">
            <div className="h-24 w-24 rounded-full bg-[var(--public-primary)]/16 blur-2xl" />
          </div>
          <div className="pointer-events-none absolute right-0 top-12 hidden md:block">
            <div className="h-24 w-24 rounded-full bg-sky-400/14 blur-2xl" />
          </div>

          <div className="font-display text-6xl italic tracking-tight text-slate-900 dark:text-white md:text-7xl">Program</div>
          <div className="-mt-3 text-6xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-7xl">Kerja</div>
          <div className="mx-auto mt-3 max-w-xl text-sm text-slate-700 dark:text-slate-300">
            Program yang lagi jalan, yang sudah selesai, dan yang lagi disiapin.
          </div>

          <div className="relative mx-auto mt-10 max-w-5xl">
            <div className="pointer-events-none absolute -left-10 top-10 h-44 w-44 rounded-full bg-[var(--public-primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-8 h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />
            {isLoadingPrograms ? (
              <div className="grid gap-5 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-4 h-6 w-10/12" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-11/12" />
                    <Skeleton className="mt-2 h-4 w-10/12" />
                    <Skeleton className="mt-5 h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/14 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
                <div className="relative">
                  <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada program kerja</div>
                  <div className="mt-2 max-w-2xl">
                    Program kerja yang dipublikasikan akan muncul di sini. Admin bisa menambahkannya dari menu Konten Website.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {programs.slice(0, 3).map((item: PublicProgram) => (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-[var(--public-primary)]/18 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-sky-400/14 blur-3xl" />
                    <div className="relative">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[var(--public-primary)]" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                          {item.date_range ?? '-'}
                        </span>
                      </div>
                      <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {item.title}
                      </div>
                      {item.description ? (
                        <div className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-4">
                          {item.description}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">Deskripsi belum diisi.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <Link
              to="/program-kerja"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--public-primary)] px-10 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110"
            >
              Lihat Semua Program Kerja
            </Link>
          </div>
        </PublicReveal>
      </section>

      <section className="relative bg-white pb-24 pt-10 dark:bg-zinc-950">
        <PublicReveal className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <div className="font-display text-6xl italic tracking-tight text-slate-900 dark:text-white md:text-7xl">Susunan</div>
            <div className="-mt-3 text-6xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-7xl">Fungsionaris</div>
          </div>

          {isLoadingStructure ? (
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-4 h-4 w-56" />
                  <Skeleton className="mt-2 h-4 w-52" />
                  <Skeleton className="mt-2 h-4 w-44" />
                </div>
              ))}
            </div>
          ) : structure.length === 0 ? (
            <div className="relative mt-12 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Struktur organisasi belum diatur</div>
                <div className="mt-2 max-w-2xl">
                  Admin bisa isi susunan fungsionaris dari menu Konten Website → Struktur.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {structure.slice(0, 3).map((g) => (
                <div key={g.id} className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-[var(--public-primary)]/12 blur-3xl" />
                  <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">{g.title}</div>
                  <div className="mt-4 space-y-2">
                    {(g.members ?? []).slice(0, 4).map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                        <div className="font-semibold text-slate-900 dark:text-white">{m.role}</div>
                        <div className="text-slate-600 dark:text-slate-300">{m.name}</div>
                      </div>
                    ))}
                    {(g.members ?? []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-black/15 bg-white/60 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                        Anggota belum diisi.
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <Link
              to="/struktur-organisasi"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
            >
              Lihat Struktur Organisasi
              <ArrowRight size={18} />
            </Link>
          </div>
        </PublicReveal>
      </section>

      <section className="relative bg-white pb-24 dark:bg-zinc-950">
        <PublicReveal className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="font-display text-5xl italic tracking-tight text-slate-900 dark:text-white md:text-6xl">Berita</div>
              <div className="-mt-2 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-6xl">Terbaru</div>
              <div className="mt-3 max-w-xl text-sm text-slate-700 dark:text-slate-300">
                Update kegiatan, prestasi, dan info kampus yang relevan buat kamu.
              </div>
            </div>
            <Link
              to="/berita"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
            >
              Lihat Semua
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoadingLatest ? (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-3 h-6 w-11/12" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-10/12" />
                    <Skeleton className="mt-5 h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              Belum ada berita yang dipublikasikan.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  to={`/berita/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]"
                >
                  <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                    {p.cover_image_url ? <img src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                      <span>{p.category?.name ?? 'Berita'}</span>
                      {p.date_label ? <span className="text-slate-300 dark:text-slate-600">•</span> : null}
                      {p.date_label ? <span className="normal-case tracking-normal">{p.date_label}</span> : null}
                    </div>
                    <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white line-clamp-2">
                      {p.title}
                    </div>
                    {p.excerpt ? (
                      <div className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-3">
                        {p.excerpt}
                      </div>
                    ) : null}
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--public-primary)]">
                      Baca
                      <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PublicReveal>
      </section>
    </PublicLayout>
  );
}
