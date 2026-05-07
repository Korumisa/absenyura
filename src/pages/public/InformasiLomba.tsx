import React, { useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { Search } from 'lucide-react';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicPost } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';

type Status = 'Buka' | 'Tutup';
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export default function InformasiLomba() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: paged } = useSWR<Paged<PublicPost>>('/public-site/posts?type=LOMBA&page=1&pageSize=24', fetcher, { revalidateOnFocus: false });
  const lomba = paged?.items ?? [];

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'Semua' | Status>('Semua');
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lomba.filter((l) => {
      const okQuery = !q || l.title.toLowerCase().includes(q);
      const okFilter = filter === 'Semua' ? true : (l.status ?? 'Buka') === filter;
      return okQuery && okFilter;
    });
  }, [lomba, query, filter]);

  const selected = useMemo(() => lomba.find((l) => l.id === openId) ?? null, [lomba, openId]);

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero top="Informasi" bottom="Lomba" subtitle="Info lomba yang masih buka/tutup, lengkap dengan detail. Konten dikelola dari menu Konten Website." />

        <PublicReveal className="mx-auto max-w-7xl px-6 pb-16">
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama lomba..."
              className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[var(--public-primary)]/50 dark:border-white/10 dark:bg-zinc-950 dark:text-slate-100"
            />
          </div>

          <div className="inline-flex w-fit overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
            {(['Semua', 'Buka', 'Tutup'] as const).map((t) => {
              const isActive = filter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  className={`h-11 px-6 text-sm font-semibold transition ${
                    isActive ? 'bg-[var(--public-primary)] text-white' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  {t}
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
                  <Skeleton className="h-5 w-10/12" />
                  <Skeleton className="mt-2 h-4 w-24" />
                  <div className="mt-4 flex items-center justify-between">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
            </div>
          ) : items.length === 0 ? (
            <div className="relative mt-10 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-left text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Belum ada informasi lomba</div>
                <div className="mt-2 max-w-2xl">Admin bisa menambahkan post tipe LOMBA dari menu Konten Website.</div>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <div key={l.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)]">
                <div className="aspect-[16/10] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {l.cover_image_url ? <img src={l.cover_image_url} alt={l.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-5">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white">{l.title}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{l.date_label ?? '-'}</div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(l.status ?? 'Buka') === 'Buka' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200'}`}>
                      {l.status ?? 'Buka'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenId(l.id)}
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
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpenId(null)}
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.7)]">
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

