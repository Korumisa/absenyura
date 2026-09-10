import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import type { PublicRecruitment } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  X,
  FileText,
  PhoneCall,
  Users2,
  ClipboardList,
  User,
  MessageCircle,
  ExternalLink,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockRecruitments } from '@/lib/utils/mockLandingData';
import { safeRelation } from '@/lib/utils/publicContent';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { publicSiteFetcher, safeArray } from '@/lib/utils/publicSiteFetcher';

function parseDateRange(dateRangeStr: string | null | undefined): { start?: Date; end?: Date } {
  if (!dateRangeStr) return {};
  const parts = String(dateRangeStr).split(' - ').map((s) => s.trim());
  const start = parts[0] ? new Date(parts[0]) : undefined;
  const end = parts[1] ? new Date(parts[1]) : undefined;
  return {
    start: start && !isNaN(start.getTime()) ? start : undefined,
    end: end && !isNaN(end.getTime()) ? end : undefined,
  };
}

function isRecruitmentOpen(r: { date_range: string | null }): boolean {
  const { start, end } = parseDateRange(r.date_range);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start) {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    if (today < s) return false;
  }
  if (end) {
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    if (today > e) return false;
  }
  return true;
}

function sanitizeDescriptionHtml(dirty: string | null | undefined): { __html: string } {
  if (!dirty) return { __html: '' };
  let cleaned = String(dirty);
  cleaned = cleaned.replace(/<(script|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  cleaned = cleaned.replace(
    /<a\s([^>]*)href="([^"]+)"([^>]*)>/gi,
    (_match, pre, href, post) => {
      const safeHref = /^https?:\/\//i.test(href) ? href : '#';
      return `<a ${pre} href="${safeHref}" ${post} target="_blank" rel="noopener noreferrer">`;
    }
  );
  cleaned = cleaned.replace(
    /<a\s([^>]*)href='([^']+)'([^>]*)>/gi,
    (_match, pre, href, post) => {
      const safeHref = /^https?:\/\//i.test(href) ? href : '#';
      return `<a ${pre} href='${safeHref}' ${post} target="_blank" rel="noopener noreferrer">`;
    }
  );
  return { __html: cleaned };
}

export default function OpenRecruitment() {
  const { swr, data, isInitialLoading: isLoading, isError, retry } = useMockOrSwr<PublicRecruitment[]>({
    swrKey: '/public-site/recruitments',
    fetcher: publicSiteFetcher<PublicRecruitment[]>,
    mockStatic: mockRecruitments,
  });
  const items = safeArray<PublicRecruitment>(data);
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => items.find((x) => x.id === openId) ?? null, [items, openId]);
  const selectedFormUrl = ensureHttpsUrl(selected?.form_url);
  const selectedIsOpen = useMemo(() => (selected ? isRecruitmentOpen(selected) : true), [selected]);
  useLockBodyScroll(Boolean(selected));
  useDialogA11y(Boolean(selected), () => closeModal(), { containerRef: modalRef });

  const openModal = (id: string) => {
    setOpenId(id);
    const next = new URLSearchParams(searchParams);
    next.set('id', id);
    setSearchParams(next);
  };

  const closeModal = () => {
    setOpenId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('id');
    setSearchParams(next);
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    if (!items.length) return;
    if (items.some((x) => x.id === id)) setOpenId(id);
  }, [items, searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const onlyOpen = items.filter((x) => isRecruitmentOpen(x));
    if (!q) return onlyOpen;
    return onlyOpen.filter((x) => String(x.title || '').toLowerCase().includes(q));
  }, [items, query]);

  const contactHref = (value: string) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return '';
    const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    return `https://wa.me/${normalized}`;
  };

  if (isError) {
    return <PublicPageError title="Gagal memuat open recruitment" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={isLoading} label="Memuat open recruitment..." />
      <PublicEnter>
        <PublicPageHero top="Open" bottom="Recruitment" subtitle="Informasi pendaftaran, deskripsi, dan link form. Bisa dikelola dari menu Konten Website.">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--public-primary)]/10 px-3.5 py-1.5 text-sm font-semibold text-[var(--public-primary)] ring-1 ring-[var(--public-primary)]/20">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--public-primary)]" />
            Ada {filtered.length} open recruitment yang sedang dibuka saat ini
          </div>
        </PublicPageHero>

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <label htmlFor="recruitment-search" className="sr-only">
                Cari open recruitment
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="recruitment-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari open recruitment..."
                aria-label="Cari open recruitment"
                className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[4/5] w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="mt-3 h-4 w-24" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-10/12" />
                    <div className="mt-5 flex items-center justify-between">
                      <Skeleton className="h-8 w-20 rounded-lg" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <PublicEmptyState
              title="Belum ada open recruitment"
              description="Admin bisa menambahkan open recruitment dari menu Konten Website."
            />
          ) : filtered.length === 0 ? (
            query.trim() ? (
              <PublicEmptyState variant="search" />
            ) : (
              <PublicEmptyState
                variant="global"
                title="Saat ini tidak ada open recruitment yang sedang dibuka"
                description="Silakan cek kembali nanti ya! Informasi lowongan baru akan diumumkan di halaman ini."
              />
            )
          ) : (
            <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((r) => {
                const open = isRecruitmentOpen(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openModal(r.id)}
                    className="group w-full overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25"
                  >
                    <div className="relative aspect-[4/5] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                      <div className="absolute left-3 top-3 z-10">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ring-1 ${
                            open
                              ? 'bg-emerald-500/95 text-white ring-emerald-600/20'
                              : 'bg-rose-500/95 text-white ring-rose-600/20'
                          }`}
                        >
                          <span className={`inline-flex h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-200' : 'bg-rose-200'}`} />
                          {open ? 'Dibuka' : 'Ditutup'}
                        </span>
                      </div>
                      <PublicCoverImage url={r.poster_image_url} alt={r.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.01]" />
                    </div>
                    <div className="p-5">
                      <div className="text-base font-extrabold tracking-tight text-slate-900 line-clamp-2">
                        {r.title}
                      </div>
                      <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        {r.date_range ?? '-'}
                      </div>
                      {r.description ? (
                        <div className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                          {String(r.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                        </div>
                      ) : null}
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition group-hover:border-[var(--public-primary)]/25">
                          Detail
                        </div>
                        <div className="inline-flex items-center rounded-xl bg-[var(--public-primary)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] transition group-hover:brightness-110">
                          Daftar
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruitment-dialog-title"
            tabIndex={-1}
            className="relative w-full max-w-5xl 2xl:max-w-6xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_38px_90px_-50px_rgba(15,23,42,0.65)] outline-none"
          >
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.10),rgba(37,99,235,0.02),transparent_60%)]" />
              <div className="relative flex items-start justify-between gap-4 border-b border-black/10 px-6 py-6 sm:px-8 sm:py-7">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--public-primary)]/12 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--public-primary)] ring-1 ring-[var(--public-primary)]/15">
                      Open Recruitment
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ring-1 ${
                        selectedIsOpen
                          ? 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/20'
                          : 'bg-rose-500/12 text-rose-600 ring-rose-500/20'
                      }`}
                    >
                      <span className={`inline-flex h-1.5 w-1.5 rounded-full ${selectedIsOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {selectedIsOpen ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                    </span>
                  </div>
                  <h2
                    id="recruitment-dialog-title"
                    className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {selected.title}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[var(--public-primary)]" />
                    {selected.date_range ?? '-'}
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/90 p-2.5 text-slate-700 transition-all duration-200 hover:border-[var(--public-primary)]/35 hover:bg-[var(--public-primary)]/5 hover:text-[var(--public-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                  onClick={closeModal}
                  aria-label="Tutup"
                >
                  <X size={20} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-8">
              <div className="flex flex-col gap-8 md:flex-row lg:gap-8 lg:grid lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-5 md:shrink-0 md:basis-[40%]">
                  <div className="group relative overflow-hidden rounded-3xl border border-black/10 bg-slate-50 shadow-[0_22px_55px_-45px_rgba(15,23,42,0.55)]">
                    <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[3/4]">
                      <PublicCoverImage
                        url={selected.poster_image_url}
                        alt={selected.title}
                        imgClassName="rail-card-image object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 md:min-w-0">
                  {selected.description ? (
                    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-[var(--public-primary)]/25 sm:p-6">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--public-primary)]/12 text-[var(--public-primary)] ring-1 ring-[var(--public-primary)]/15">
                          <FileText size={18} strokeWidth={2} />
                        </span>
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--public-primary)]">
                          Deskripsi Kegiatan
                        </h3>
                      </div>
                      <div
                        className="recruitment-prose relative mt-4 text-[15px] leading-relaxed text-slate-700 sm:text-[15.5px] [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-extrabold [&_h3]:tracking-tight [&_h3]:text-slate-900 [&_h4]:mt-5 [&_h4]:mb-1.5 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-slate-900 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-slate-900 [&_a]:text-[var(--public-primary)] [&_a]:underline [&_a]:underline-offset-2"
                        // XSS-sanitized HTML via sanitizeDescriptionHtml helper (script/style/on* attrs stripped)
                        dangerouslySetInnerHTML={sanitizeDescriptionHtml(selected.description)}
                      />
                    </div>
                  ) : null}

                  {safeRelation(selected.contacts).length ? (
                    <div className="group relative overflow-hidden rounded-3xl border-emerald-100 ring-1 ring-emerald-50/60 bg-white p-5 shadow-sm transition-all duration-300 hover:border-[var(--public-primary)]/20 sm:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/15">
                            <PhoneCall size={18} strokeWidth={2} />
                          </span>
                          <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900">Contact Person</h3>
                        </div>
                        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-600 ring-1 ring-black/5">
                          {safeRelation(selected.contacts).length} kontak
                        </div>
                      </div>
                      <div className="relative mt-5 grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                        {safeRelation(selected.contacts).map((c) => (
                          <a
                            key={c.id}
                            href={contactHref(c.contact)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Hubungi ${c.name} via ${String(c.contact).startsWith('http') ? 'link' : 'WhatsApp'}: ${c.contact}`}
                            title={`${c.name} — ${c.contact}`}
                            className="group/card relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-white to-slate-50 p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-white hover:shadow-[0_18px_40px_-30px_rgba(16,185,129,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45"
                          >
                            <div className="flex items-start gap-3">
                              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/10">
                                <MessageCircle size={20} strokeWidth={2} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  title={c.name}
                                  className="text-base font-semibold leading-snug text-slate-900 line-clamp-2"
                                >
                                  {c.name}
                                </div>
                                <div
                                  title={c.contact}
                                  className="mt-1 text-sm text-slate-600 leading-relaxed transition-colors duration-200 group-hover/card:text-emerald-600 line-clamp-2"
                                >
                                  {c.contact}
                                </div>
                              </div>
                              <span className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-all duration-300 group-hover/card:-translate-x-0.5 group-hover/card:text-emerald-600">
                                <ExternalLink size={16} strokeWidth={2} />
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-black/15 bg-slate-50/80 p-5 text-sm text-slate-500 sm:p-6">
                      Belum ada narahubung. Informasi kontak akan segera diumumkan.
                    </div>
                  )}

                  {safeRelation(selected.committee).length ? (
                    <div className="group relative overflow-hidden rounded-3xl border-violet-100 ring-1 ring-violet-50/60 bg-white p-5 shadow-sm transition-all duration-300 hover:border-[var(--public-primary)]/20 sm:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/15">
                            <Users2 size={18} strokeWidth={2} />
                          </span>
                          <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900">Panitia / Posisi</h3>
                        </div>
                        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-600 ring-1 ring-black/5">
                          {safeRelation(selected.committee).length} orang
                        </div>
                      </div>
                      <div className="relative mt-5 grid gap-4 grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                        {safeRelation(selected.committee).map((p) => (
                          <div
                            key={p.id}
                            className="group/card relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-white to-slate-50 p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-white hover:shadow-[0_14px_35px_-28px_rgba(139,92,246,0.45)]"
                          >
                            <div className="pointer-events-none absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--public-primary)] transition-all duration-300 group-hover/card:bg-violet-500" />
                            <div className="flex items-start gap-3 pl-3">
                              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/10">
                                <User size={20} strokeWidth={2} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  title={p.name}
                                  className="text-base font-semibold leading-snug text-slate-900 line-clamp-2"
                                >
                                  {p.name}
                                </div>
                                <div
                                  title={p.role}
                                  className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-2"
                                >
                                  {p.role}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-black/15 bg-slate-50/80 p-5 text-sm text-slate-500 sm:p-6">
                      Belum ada struktur panitia. Akan diumumkan segera setelah tim selesai disusun.
                    </div>
                  )}

                  <div className="group relative overflow-hidden rounded-3xl border-l-4 border-[var(--public-primary)] border-t border-r border-b border-black/10 bg-gradient-to-br from-white via-white to-[var(--public-primary)]/[0.04] p-5 shadow-md sm:p-6">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/15">
                        <ClipboardList size={18} strokeWidth={2} />
                      </span>
                      <h3 className="text-[15px] font-extrabold tracking-tight text-slate-900">Pendaftaran</h3>
                    </div>
                    {selectedFormUrl ? (
                      <div className="relative mt-5 flex flex-col-reverse gap-3.5 sm:flex-row sm:justify-end sm:items-center">
                        <button
                          type="button"
                          className="group/btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_8px_20px_-18px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/40 sm:w-auto"
                          onClick={closeModal}
                        >
                          Tutup
                        </button>
                        {selectedIsOpen ? (
                          isAuthenticated && user ? (
                            <a
                              href={selectedFormUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--public-primary)] px-6 text-center text-sm font-bold text-white shadow-[0_18px_40px_-20px_rgba(37,99,235,0.75)] ring-1 ring-[var(--public-primary)]/25 transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_24px_50px_-20px_rgba(37,99,235,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/60 sm:w-auto"
                            >
                              Daftar Sekarang
                              <span className="inline-flex transition-transform duration-250 group-hover/btn:translate-x-0.5">
                                <ArrowRight size={16} strokeWidth={2.2} />
                              </span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.set('id', selected.id);
                                navigate('/login', {
                                  state: { from: { pathname: location.pathname, search: `?${next.toString()}` } },
                                });
                              }}
                              className="group/btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--public-primary)] px-6 text-sm font-bold text-white shadow-[0_18px_40px_-20px_rgba(37,99,235,0.75)] ring-1 ring-[var(--public-primary)]/25 transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_24px_50px_-20px_rgba(37,99,235,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/60 sm:w-auto"
                            >
                              Login untuk Daftar
                              <span className="inline-flex transition-transform duration-250 group-hover/btn:translate-x-0.5">
                                <LogIn size={16} strokeWidth={2.2} />
                              </span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            title="Pendaftaran telah ditutup"
                            className="group/btn inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200/70 px-6 text-sm font-bold text-slate-500 ring-1 ring-slate-300/60 sm:w-auto"
                          >
                            Pendaftaran Telah Ditutup
                            <span className="inline-flex opacity-70">
                              <X size={16} strokeWidth={2.2} />
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="relative mt-4 text-sm text-slate-500">Link pendaftaran belum diatur.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}
