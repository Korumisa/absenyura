import React, { useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicPost, PublicPostType } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';

const TABS: Array<{ label: string; type?: PublicPostType }> = [
  { label: 'Semua' },
  { label: 'Kegiatan', type: 'KEGIATAN' },
  { label: 'Berita', type: 'BERITA' },
  { label: 'Pengumuman', type: 'PENGUMUMAN' },
];

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export default function Kegiatan() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const [tab, setTab] = useState<string>('Semua');
  const [openId, setOpenId] = useState<string | null>(null);

  const url = useMemo(() => {
    const selected = TABS.find((t) => t.label === tab);
    const sp = new URLSearchParams();
    sp.set('page', '1');
    sp.set('pageSize', '24');
    if (selected?.type) sp.set('type', selected.type);
    return `/public-site/posts?${sp.toString()}`;
  }, [tab]);

  const { data: paged } = useSWR<Paged<PublicPost>>(url, fetcher, { revalidateOnFocus: false });
  const items = useMemo(() => {
    const list = paged?.items ?? [];
    const selected = TABS.find((t) => t.label === tab);
    if (!selected?.type) return list.filter((e) => e.type !== 'LOMBA');
    return list;
  }, [paged?.items, tab]);

  const selected = useMemo(() => (paged?.items ?? []).find((e) => e.id === openId) ?? null, [paged?.items, openId]);

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero top="Informasi" bottom="Kegiatan" subtitle="Kumpulan kegiatan, berita, dan pengumuman (tanpa lomba). Konten dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          <div className="mt-8 flex justify-center">
          <div className="inline-flex w-fit overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
            {TABS.map((t) => {
              const active = tab === t.label;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTab(t.label)}
                  className={`h-11 px-6 text-sm font-semibold transition ${active ? 'bg-[var(--public-primary)] text-white' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          </div>

          {!paged ? (
            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
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
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada informasi</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan kegiatan/berita/pengumuman dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <div key={e.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]">
                <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {e.cover_image_url ? <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">{e.type}</div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{e.title}</div>
                  <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{e.date_label ?? '-'}</div>
                  {e.excerpt ? <div className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{e.excerpt}</div> : null}
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => setOpenId(e.id)}
                      className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/30 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                    >
                      Lihat Detail
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </PublicReveal>
      </PublicEnter>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={() => setOpenId(null)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] dark:bg-zinc-950">
            <div className="aspect-[16/8] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
              {selected.cover_image_url ? <img src={selected.cover_image_url} alt={selected.title} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{selected.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.date_label ?? '-'}</div>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-[var(--public-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  onClick={() => setOpenId(null)}
                >
                  Tutup
                </button>
              </div>
              {selected.excerpt ? <div className="mt-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{selected.excerpt}</div> : null}
              {selected.content ? <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{selected.content}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </PublicLayout>
  );
}

