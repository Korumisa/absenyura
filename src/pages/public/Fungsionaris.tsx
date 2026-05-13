import React, { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile, PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicPhotoFrame from '@/components/PublicPhotoFrame';
import PublicCoverImage from '@/components/PublicCoverImage';
import useFirstLoadOverlay from '@/lib/useFirstLoadOverlay';

export default function Fungsionaris() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: groups = [], isLoading } = useSWR<PublicStructureGroup[]>('/public-site/structure', fetcher, { revalidateOnFocus: false });
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });
  const showLoading = useFirstLoadOverlay(isLoading);

  const ordered = useMemo(
    () => groups.slice().sort((a, b) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999)),
    [groups],
  );

  const isCoreByTitle = (title: string) => {
    const t = String(title ?? '').toLowerCase();
    return t.includes('inti') || t.includes('badan pengurus harian') || t === 'bph';
  };

  const coreGroups = useMemo(() => ordered.filter((g) => Boolean((g as any).is_core) || isCoreByTitle(g.title)), [ordered]);
  const bidangGroups = useMemo(() => ordered.filter((g) => !coreGroups.some((x) => x.id === g.id)), [ordered, coreGroups]);

  const [activeId, setActiveId] = useState<string>('');
  useEffect(() => {
    if (!activeId && bidangGroups.length) setActiveId(bidangGroups[0].id);
  }, [activeId, bidangGroups]);

  const activeGroup = bidangGroups.find((g) => g.id === activeId) ?? null;
  const kabinetName = profile?.kabinet_name ?? '';
  const kabinetPeriod = profile?.kabinet_period ?? '';
  const subtitleBits = [kabinetName, kabinetPeriod].map((x) => String(x || '').trim()).filter(Boolean);

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicPageHero
        top="Susunan"
        bottom="Fungsionaris"
        subtitle={subtitleBits.length ? subtitleBits.join(' • ') : 'Susunan fungsionaris yang dapat dikelola dari menu Konten Website.'}
        compact
      />

      <div className="mx-auto -mt-6 max-w-7xl px-4 pb-24 sm:px-6">
        {isLoading ? (
          <div className="mt-6 space-y-10">
            {Array.from({ length: 2 }).map((_, gi) => (
              <div key={gi}>
                <div className="mb-6 flex justify-center">
                  <Skeleton className="h-10 w-56" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((__, idx) => (
                    <div key={idx} className="rounded-2xl border border-black/10 bg-white p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="mt-2 h-4 w-44" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-slate-600 sm:p-10">
            <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
            <div className="relative">
              <div className="text-base font-extrabold tracking-tight text-slate-900">Struktur organisasi belum diatur</div>
              <div className="mt-2 max-w-2xl">Admin bisa mengatur grup dan anggota dari menu Konten Website.</div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-12">
            <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white px-4 py-10 shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)] sm:px-6 lg:px-8">
              <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_20%,rgba(37,99,235,0.12),transparent_56%),radial-gradient(circle_at_82%_15%,rgba(56,189,248,0.10),transparent_60%)]" />
              <div className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
                    INTI
                  </div>
                  <div className="mt-4 text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl md:text-5xl">
                    Pengurus Inti
                  </div>
                  <div className="mx-auto mt-3 max-w-2xl text-sm text-slate-700">Susunan inti yang memimpin dan mengoordinasikan jalannya organisasi.</div>
                </div>

                {coreGroups.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white/70 px-6 py-5 text-sm text-slate-600">
                    Belum ada data inti.
                  </div>
                ) : (
                  <div className="mt-10 grid grid-cols-1 justify-items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {coreGroups
                      .flatMap((g) => (g.members ?? []).map((m) => ({ ...m, _group: g.title })))
                      .map((p) => {
                        const initial = String(p.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                        return (
                          <div
                            key={p.id}
                            className="group relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25 active:scale-[0.99]"
                          >
                            <PublicPhotoFrame className="aspect-[4/5] w-full" inset={10}>
                              {p.photo_url ? (
                                <PublicCoverImage
                                  url={p.photo_url}
                                  alt={p.name}
                                  imgClassName="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.02))]">
                                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/80 text-4xl font-extrabold text-[var(--public-primary)] ring-1 ring-black/10">
                                    {initial}
                                  </div>
                                </div>
                              )}
                            </PublicPhotoFrame>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <div className="truncate text-sm font-extrabold tracking-tight text-white">{p.role}</div>
                              <div className="mt-1 truncate text-xs font-semibold text-white/90">{p.name}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white px-4 py-10 shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)] sm:px-6 lg:px-8">
              <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_16%_18%,rgba(37,99,235,0.10),transparent_56%),radial-gradient(circle_at_84%_14%,rgba(56,189,248,0.10),transparent_60%)]" />
              <div className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
                    BIDANG
                  </div>
                  <div className="mt-4 text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl md:text-5xl">
                    Koordinator & Divisi
                  </div>
                  <div className="mx-auto mt-3 max-w-2xl text-sm text-slate-700">
                    Pilih bidang untuk melihat susunan pengurus dan anggotanya.
                  </div>
                </div>

                {bidangGroups.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white/70 px-6 py-5 text-sm text-slate-600">
                    Belum ada bidang/divisi.
                  </div>
                ) : (
                  <>
                    <div className="mt-8 overflow-x-auto pb-2 scrollbar-hide">
                      <div className="flex w-max gap-2">
                        {bidangGroups.map((g) => {
                          const active = g.id === activeId;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setActiveId(g.id)}
                              className={[
                                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition',
                                active
                                  ? 'bg-[var(--public-primary)] text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)]'
                                  : 'border border-black/10 bg-white text-slate-700 hover:border-[var(--public-primary)]/30',
                              ].join(' ')}
                            >
                              {g.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="text-center">
                        <div className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{activeGroup?.title ?? ''}</div>
                        <div className="mx-auto mt-3 h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-[var(--public-primary)]/35 to-transparent" />
                      </div>

                      {activeGroup && (activeGroup.members ?? []).length ? (
                        <div className="mt-8 grid grid-cols-1 justify-items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {activeGroup.members.map((p) => {
                            const initial = String(p.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                            const spotlight = Boolean((p as any).is_spotlight);
                            return (
                              <div
                                key={p.id}
                                className={[
                                  'group relative w-full overflow-hidden rounded-2xl border bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 active:scale-[0.99]',
                                  spotlight ? 'border-[var(--public-primary)]/35' : 'border-black/10 hover:border-[var(--public-primary)]/25',
                                ].join(' ')}
                              >
                                <PublicPhotoFrame className="aspect-[4/5] w-full" inset={10}>
                                  {p.photo_url ? (
                                    <PublicCoverImage
                                      url={p.photo_url}
                                      alt={p.name}
                                      imgClassName="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                                    />
                                  ) : (
                                    <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.02))]">
                                      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/80 text-4xl font-extrabold text-[var(--public-primary)] ring-1 ring-black/10">
                                        {initial}
                                      </div>
                                    </div>
                                  )}
                                </PublicPhotoFrame>
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-4">
                                  <div className="truncate text-sm font-extrabold tracking-tight text-white">{p.role}</div>
                                  <div className="mt-1 truncate text-xs font-semibold text-white/90">{p.name}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white/70 px-6 py-5 text-sm text-slate-600">
                          Anggota belum diisi.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

