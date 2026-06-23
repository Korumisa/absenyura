import React, { useMemo, useRef, useState } from 'react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicPost, PublicPostType } from '@/types/publicSite';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import useLockBodyScroll from '@/lib/a11y/useLockBodyScroll';
import { m } from 'framer-motion';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';

const TABS: Array<{ label: string; type?: PublicPostType }> = [
  { label: 'Semua (tanpa lomba)' },
  { label: 'Kegiatan', type: 'KEGIATAN' },
  { label: 'Berita', type: 'BERITA' },
  { label: 'Pengumuman', type: 'PENGUMUMAN' },
];

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export default function Kegiatan() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const [tab, setTab] = useState<string>('Semua (tanpa lomba)');
  const [openId, setOpenId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useDialogA11y(Boolean(openId), () => setOpenId(null), { containerRef: modalRef });

  const url = useMemo(() => {
    const selected = TABS.find((t) => t.label === tab);
    const sp = new URLSearchParams();
    sp.set('page', '1');
    sp.set('pageSize', '24');
    if (selected?.type) sp.set('type', selected.type);
    return `/public-site/posts?${sp.toString()}`;
  }, [tab]);

  const swr = useSWR<Paged<PublicPost>>(url, fetcher, { revalidateOnFocus: false });
  const { data: paged, isInitialLoading: isLoading, isError, retry } = useSwrPageState(swr);
  const items = useMemo(() => {
    const list = paged?.items ?? [];
    const selected = TABS.find((t) => t.label === tab);
    if (!selected?.type) return list.filter((e) => e.type !== 'LOMBA');
    return list;
  }, [paged?.items, tab]);

  const selected = useMemo(() => (paged?.items ?? []).find((e) => e.id === openId) ?? null, [paged?.items, openId]);
  useLockBodyScroll(Boolean(selected));
  const reducedMotion = useReducedMotion();

  if (isError) {
    return <PublicPageError title="Gagal memuat kegiatan" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero
          top="Informasi"
          bottom="Terbaru"
          subtitle="Kumpulan kegiatan, berita, dan pengumuman (tanpa lomba). Pilih tab untuk memfilter."
        />

        <PublicReveal className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mt-8 flex justify-center">
            <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-black/10 bg-white p-2 md:w-fit">
              {TABS.map((t) => {
                const active = tab === t.label;
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setTab(t.label)}
                    className={`relative h-10 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45 sm:h-11 sm:px-6 sm:text-sm ${
                      active ? 'text-white' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {active ? (
                      reducedMotion ? (
                        <div className="absolute inset-0 rounded-lg bg-[var(--public-primary)]" aria-hidden="true" />
                      ) : (
                        <m.div
                          layoutId="kegiatan-tab"
                          className="absolute inset-0 rounded-lg bg-[var(--public-primary)]"
                          transition={{ type: 'spring', stiffness: 460, damping: 44 }}
                        />
                      )
                    ) : null}
                    {!active ? (
                      <div className="absolute inset-0 rounded-lg transition hover:bg-slate-50" />
                    ) : null}
                    <span className="relative">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!paged ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-5 w-11/12" />
                    <Skeleton className="mt-3 h-4 w-24" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-10/12" />
                    <Skeleton className="mt-6 h-9 w-28 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <PublicEmptyState
              title="Belum ada informasi"
              description="Admin bisa menambahkan kegiatan, berita, atau pengumuman dari menu Konten Website."
            />
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 lg:grid-cols-3">
              {items.map((e) => (
                <div
                  key={e.id}
                  className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25"
                >
                  <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))]">
                    <PublicCoverImage url={e.cover_image_url} alt={e.title} imgClassName="transition duration-700 group-hover:scale-[1.01]" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{e.type}</div>
                      <div className="text-xs font-semibold text-muted-foreground">{e.date_label ?? '-'}</div>
                    </div>
                    <div className="mt-3 text-base font-extrabold tracking-tight text-slate-900 line-clamp-2">{e.title}</div>
                    {e.excerpt ? <div className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">{e.excerpt}</div> : null}
                    <div className="mt-5">
                      {e.type === 'BERITA' ? (
                        <Link
                          to={`/berita/${e.slug}`}
                          className="inline-flex rounded-xl bg-[var(--public-primary)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                        >
                          Baca Selengkapnya
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpenId(e.id)}
                          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
                        >
                          Lihat Detail
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setOpenId(null)} />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-post-dialog-title"
            tabIndex={-1}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] outline-none"
          >
            <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 id="public-post-dialog-title" className="truncate text-base font-extrabold tracking-tight text-slate-900">
                  {selected.title}
                </h2>
                <div className="mt-1 text-sm text-muted-foreground">{selected.date_label ?? '-'}</div>
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

            <div className="grid max-h-[82vh] gap-6 overflow-y-auto p-6 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
                <div className="aspect-[4/5] w-full">
                  <PublicCoverImage url={selected.cover_image_url} alt={selected.title} imgClassName="object-cover" />
                </div>
              </div>
              <div className="min-w-0">
                {selected.excerpt ? <div className="text-sm leading-relaxed text-slate-700">{selected.excerpt}</div> : null}
                {selected.content ? <div className="mt-4 break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.content}</div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}
