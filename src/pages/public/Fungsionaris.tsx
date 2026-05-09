import React from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicPageHero from '@/components/PublicPageHero';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import PublicPhotoFrame from '@/components/PublicPhotoFrame';
import PublicCoverImage from '@/components/PublicCoverImage';
import useFirstLoadOverlay from '@/lib/useFirstLoadOverlay';

export default function Fungsionaris() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: groups = [], isLoading } = useSWR<PublicStructureGroup[]>('/public-site/structure', fetcher, { revalidateOnFocus: false });
  const showLoading = useFirstLoadOverlay(isLoading);

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={showLoading} />
      <PublicPageHero
        top="Struktur"
        bottom="Organisasi"
        subtitle="Susunan fungsionaris yang dapat dikelola dari menu Konten Website."
        compact
      />

      <div className="mx-auto max-w-7xl px-4 pb-24 -mt-6 sm:px-6">
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
            {groups.map((group, gidx) => (
              <section
                key={group.id}
                id={`divisi-${group.id}`}
                className={`scroll-mt-28 relative overflow-hidden rounded-3xl border border-black/10 px-4 py-10 shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)] sm:px-6 lg:px-8 ${
                  gidx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                }`}
              >
                <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_20%,rgba(37,99,235,0.12),transparent_56%),radial-gradient(circle_at_82%_15%,rgba(56,189,248,0.10),transparent_60%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:52px_52px]" />
                <div
                  className={`pointer-events-none absolute top-6 hidden md:block ${
                    gidx % 2 === 0 ? 'left-6' : 'right-6'
                  }`}
                >
                  <div className="h-20 w-20 rotate-6 rounded-[24px] bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(255,255,255,0.9))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
                  <div className="-mt-7 ml-12 h-16 w-16 -rotate-6 rounded-[22px] bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(255,255,255,0.92))] shadow-[0_26px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-black/10 backdrop-blur" />
                  <div className="-mt-8 ml-2 h-10 w-10 rotate-12 rounded-[16px] bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(255,255,255,0.94))] ring-1 ring-black/10 backdrop-blur" />
                </div>
                <div className="relative">
                  <div className="text-center">
                    <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
                      Divisi
                    </div>
                    <div className="mt-4 text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl md:text-5xl">
                      {group.title}
                    </div>
                    <div className="relative mx-auto mt-4 h-1 w-72">
                      <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-[var(--public-primary)]/75 to-transparent shadow-[0_10px_28px_rgba(37,99,235,0.22)]" />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/18 blur-2xl" />
                    </div>
                  </div>
                  <div className="mx-auto mt-7 max-w-5xl">
                    <div className="relative">
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--public-primary)]/30 to-transparent" />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/12 blur-2xl" />
                    </div>
                  </div>

                  {(group.members ?? []).length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white/70 px-6 py-5 text-sm text-slate-600">
                      Anggota belum diisi.
                    </div>
                  ) : (
                    (() => {
                      const members = group.members ?? [];
                      if (members.length <= 3) {
                        return (
                          <div className="mt-8 flex flex-wrap justify-center gap-4">
                            {members.map((p) => {
                              const initial = String(p.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                              return (
                                <div
                                  key={p.id}
                                  className="group relative w-full max-w-none overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25 active:scale-[0.99] md:max-w-[220px]"
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
                        );
                      }
                      const key = (v: unknown) => String(v ?? '').toLowerCase();
                      const leaderIndex = members.findIndex((m) => {
                        const r = key((m as any).role);
                        return r.includes('kabid') || r.includes('ketua') || r.includes('koordinator');
                      });
                      const leader = members[Math.max(0, leaderIndex)] ?? members[0];
                      const rest = members.filter((m) => m.id !== leader.id);
                      const right = rest.slice(0, 4);
                      const below = rest.slice(4);
                      const leaderInitial = String(leader?.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';

                      return (
                        <div className="mt-8">
                          <div className="grid items-start gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr]">
                          <div className="group relative self-start overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)]">
                            <div className="pointer-events-none absolute left-6 top-6 h-12 w-12 rotate-6 rounded-[18px] bg-white/10 ring-1 ring-white/20 backdrop-blur" />
                            <div className="pointer-events-none absolute left-12 top-12 h-7 w-7 -rotate-6 rounded-[14px] bg-white/10 ring-1 ring-white/20 backdrop-blur" />
                            <div className="pointer-events-none absolute right-6 top-6 h-8 w-8 rotate-12 rounded-[14px] bg-white/10 ring-1 ring-white/20 backdrop-blur" />
                            <div className="pointer-events-none absolute right-8 top-14 h-14 w-14 -rotate-6 rounded-[20px] bg-white/10 ring-1 ring-white/20 backdrop-blur" />

                            <div className="relative h-[240px] w-full bg-slate-100 sm:h-[300px] md:h-[340px] lg:h-[566px]">
                              {leader?.photo_url ? (
                                <PublicCoverImage
                                  url={leader.photo_url}
                                  alt={leader.name}
                                  imgClassName="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.02))]">
                                  <div className="grid h-24 w-24 place-items-center rounded-3xl bg-white/85 text-5xl font-extrabold text-[var(--public-primary)] ring-1 ring-black/10">
                                    {leaderInitial}
                                  </div>
                                </div>
                              )}
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                              <div className="absolute inset-x-0 bottom-0 p-6">
                                <div className="mt-3 truncate text-base font-extrabold tracking-tight text-white">{leader?.role}</div>
                                <div className="mt-1 truncate text-sm font-semibold text-white/90">{leader?.name}</div>
                              </div>
                            </div>
                          </div>

                          {right.length > 0 ? (
                            <div className="grid max-w-none gap-4 content-start justify-items-stretch md:max-w-[480px] md:grid-cols-2 md:justify-items-start">
                              {right.map((p) => {
                                const initial = String(p.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                                return (
                                  <div
                                    key={p.id}
                                    className="group relative w-full max-w-none overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25 active:scale-[0.99] md:max-w-[220px]"
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
                            <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 px-6 py-5 text-sm text-slate-600">
                              Anggota lainnya belum diisi.
                            </div>
                          )}
                          </div>

                          {below.length > 0 ? (
                            <div className="mt-6">
                              <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                              <div className="grid grid-cols-1 justify-items-stretch gap-4 md:grid-cols-[repeat(auto-fit,minmax(180px,220px))] md:justify-start md:justify-items-start">
                                {below.map((p) => {
                                  const initial = String(p.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                                  return (
                                    <div
                                      key={p.id}
                                      className="group relative w-full max-w-none overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25 active:scale-[0.99] md:max-w-[220px]"
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
                            </div>
                          ) : null}
                        </div>
                      );
                    })()
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

