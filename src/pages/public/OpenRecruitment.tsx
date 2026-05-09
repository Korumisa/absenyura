import React, { useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicRecruitment } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/useLockBodyScroll';
import useFirstLoadOverlay from '@/lib/useFirstLoadOverlay';

export default function OpenRecruitment() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: items = [], isLoading } = useSWR<PublicRecruitment[]>('/public-site/recruitments', fetcher, { revalidateOnFocus: false });
  const showLoading = useFirstLoadOverlay(isLoading);

  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = useMemo(() => items.find((x) => x.id === openId) ?? null, [items, openId]);
  useLockBodyScroll(Boolean(selected));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => String(x.title || '').toLowerCase().includes(q));
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

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicEnter>
        <PublicPageHero top="Open" bottom="Recruitment" subtitle="Informasi pendaftaran, deskripsi, dan link form. Bisa dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari open recruitment..."
                className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900">Belum ada open recruitment</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan open recruitment dari menu Konten Website.</div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-sm text-slate-600">
              Tidak ada data yang cocok dengan pencarian.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] justify-start justify-items-start gap-6">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="group w-full max-w-[260px] overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25"
                >
                  <div className="aspect-[4/5] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                    <PublicCoverImage url={r.poster_image_url} alt={r.title} imgClassName="object-cover transition duration-700 group-hover:scale-[1.01]" />
                  </div>
                  <div className="p-5">
                    <div className="text-base font-extrabold tracking-tight text-slate-900 line-clamp-2">{r.title}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{r.date_range ?? '-'}</div>
                    {r.description ? <div className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">{r.description}</div> : null}
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
              ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setOpenId(null)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)]">
            <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold tracking-tight text-slate-900">{selected.title}</div>
                <div className="mt-1 text-sm text-slate-600">{selected.date_range ?? '-'}</div>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white p-2 text-slate-800 hover:bg-slate-50"
                onClick={() => setOpenId(null)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid max-h-[82vh] gap-6 overflow-y-auto p-6 md:grid-cols-[320px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
                <div className="aspect-[16/10] w-full">
                  <PublicCoverImage url={selected.poster_image_url} alt={selected.title} imgClassName="object-cover" />
                </div>
              </div>

              <div className="min-w-0">
                {selected.description ? <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{selected.description}</div> : null}

                {selected.contacts?.length ? (
                  <div className="mt-6">
                    <div className="text-sm font-extrabold tracking-tight text-slate-900">Contact Person</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selected.contacts.map((c) => (
                        <a
                          key={c.id}
                          href={contactHref(c.contact)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:border-[var(--public-primary)]/30"
                        >
                          <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                          <div className="mt-1 text-sm text-slate-600">{c.contact}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected.committee?.length ? (
                  <div className="mt-6">
                    <div className="text-sm font-extrabold tracking-tight text-slate-900">Panitia</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selected.committee.map((p) => (
                        <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-4">
                          <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                          <div className="text-sm text-slate-600">{p.role}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected.form_url ? (
                  <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-[var(--public-primary)]/25"
                      onClick={() => setOpenId(null)}
                    >
                      Tutup
                    </button>
                    <a
                      href={selected.form_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-[var(--public-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] transition hover:brightness-110"
                    >
                      Daftar Sekarang
                    </a>
                  </div>
                ) : (
                  <div className="mt-8 text-sm text-slate-600">Link pendaftaran belum diatur.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

