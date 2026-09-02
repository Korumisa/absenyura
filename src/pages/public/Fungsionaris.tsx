import React, { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProfile, PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import { AnimatePresence, m } from 'framer-motion';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';
import { fadeTransition } from '@/lib/perf/motionPresets';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

export default function Fungsionaris() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data);
  const structureSwr = useSWR<{ data: PublicStructureGroup[], cabinet: any, allCabinets: any[] }>('/public-site/structure', fetcher, { revalidateOnFocus: false });
  const { data: structureData, isInitialLoading: isLoading, isError, retry } = useSwrPageState(structureSwr);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  
  const allCabinets = useMemo(() => structureData?.allCabinets ?? [], [structureData]);
  const activeCabinet = structureData?.cabinet;
  const selectedCabinet = useMemo(() => {
    if (selectedCabinetId) {
      return allCabinets.find(c => c.id === selectedCabinetId);
    }
    return activeCabinet;
  }, [allCabinets, selectedCabinetId, activeCabinet]);
  
  const groups = useMemo(() => selectedCabinet?.groups ?? [], [selectedCabinet]);
  const cabinet = selectedCabinet ?? null;
  const { data: profile } = useSWR<PublicProfile | null>('/public-site/profile', (url) => api.get(url).then(r => r.data.data), { revalidateOnFocus: false });
  const reducedMotion = useReducedMotion();

  const ordered = useMemo(
    () => groups.slice().sort((a: any, b: any) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999)),
    [groups],
  );

  const isCoreByTitle = (title: string) => {
    const t = String(title ?? '').toLowerCase();
    return t.includes('inti') || t.includes('badan pengurus harian') || t === 'bph';
  };

  const isAdvisorByTitle = (title: string) => {
    const t = String(title ?? '').toLowerCase();
    return t.includes('dosen') || t.includes('pembimbing') || t.includes('pembina');
  };

  const advisorGroups = useMemo(() => ordered.filter((g: any) => isAdvisorByTitle(g.title)), [ordered]);
  const coreGroups = useMemo(
    () => ordered.filter((g: any) => !advisorGroups.some((x: any) => x.id === g.id) && (Boolean(g.is_core) || isCoreByTitle(g.title))),
    [ordered, advisorGroups],
  );
  const bidangGroups = useMemo(
    () => ordered.filter((g: any) => !advisorGroups.some((x: any) => x.id === g.id) && !coreGroups.some((x: any) => x.id === g.id)),
    [ordered, advisorGroups, coreGroups],
  );

  const [activeId, setActiveId] = useState<string>('');
  useEffect(() => {
    if (!activeId && bidangGroups.length) setActiveId(bidangGroups[0].id);
  }, [activeId, bidangGroups]);

  const activeGroup = bidangGroups.find((g: any) => g.id === activeId) ?? null;
  const kabinetName = cabinet?.name ?? profile?.kabinet_name ?? '';
  const kabinetPeriod = cabinet?.period ?? profile?.kabinet_period ?? '';
  const subtitleBits = [kabinetName, kabinetPeriod].map((x) => String(x || '').trim()).filter(Boolean);

  const sortedMembers = (members: any[]) =>
    (members ?? []).slice().sort((a: any, b: any) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999));

  const corePeople = useMemo(() => sortedMembers(coreGroups.flatMap((g: any) => g.members ?? [])), [coreGroups]);
  const advisorPeople = useMemo(() => sortedMembers(advisorGroups.flatMap((g: any) => g.members ?? [])), [advisorGroups]);
  const pickLeader = (people: PublicStructureGroup['members']) => {
    const spotlight = people.find((p) => Boolean(p.is_spotlight));
    if (spotlight) return spotlight;
    const ketua = people.find((p) => String(p.role ?? '').toLowerCase().includes('ketua'));
    if (ketua) return ketua;
    return people[0] ?? null;
  };

  const renderAvatar = (p: any, size: 'xl' | 'lg' | 'md') => {
    const sizeClass =
      size === 'xl'
        ? 'h-36 w-36 sm:h-44 sm:w-44'
        : size === 'lg'
          ? 'h-28 w-28 sm:h-32 sm:w-32'
          : 'h-20 w-20 sm:h-24 sm:w-24';
    return (
      <div key={p.id} className="flex w-[180px] flex-col items-center text-center sm:w-[200px]">
        <div
          className={[
            'relative overflow-hidden rounded-full border-[3px] border-[var(--public-primary)] bg-slate-100 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)]',
            sizeClass,
          ].join(' ')}
        >
          <PublicCoverImage url={p.photo_url} alt={p.name ?? 'Anggota'} imgClassName="object-cover" />
        </div>
        <div className="mt-3 text-sm font-extrabold tracking-tight text-slate-900">{p.name ?? '-'}</div>
        <div className="mt-1 text-xs font-semibold text-muted-foreground">{p.role ?? '-'}</div>
      </div>
    );
  };

  if (isError) {
    return (
      <PublicPageError title="Gagal memuat fungsionaris" error={structureSwr.error} onRetry={retry} />
    );
  }

  return (
    <PublicLayout>
      <PublicLoadingOverlay show={isLoading} label="Memuat fungsionaris..." />
      <PublicEnter>
        <PublicPageHero
          top="Susunan"
          bottom="Fungsionaris"
          subtitle={subtitleBits.length ? subtitleBits.join(' • ') : 'Susunan fungsionaris yang dapat dikelola dari menu Konten Website.'}
          compact
        />
      </PublicEnter>

      {/* Cabinet Switcher */}
      {allCabinets.length > 1 && (
        <PublicEnter>
          <div className="mx-auto -mt-4 max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {allCabinets.map((cab: any) => {
                const isSelected = cabinet?.id === cab.id;
                return (
                  <button
                    key={cab.id}
                    type="button"
                    onClick={() => setSelectedCabinetId(isSelected ? null : cab.id)}
                    className={
                      (isSelected
                        ? "bg-[var(--public-primary)] text-white shadow-[0_10px_22px_rgba(37,99,235,0.35)]"
                        : "bg-white text-slate-900 border border-black/10 hover:border-[var(--public-primary)]/40"
                      ) + " inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition"
                    }
                  >
                    {cab.name}
                    <span className="text-[10px] opacity-75">{cab.period}</span>
                    {cab.is_active && !isSelected && <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </PublicEnter>
      )}

      <PublicReveal className="mx-auto -mt-6 max-w-7xl px-4 pb-24 sm:px-6">
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
                        <Skeleton className="size-16 rounded-full" />
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
          <div className="mt-6">
            <PublicEmptyState
              variant="global"
              title="Struktur organisasi belum diatur"
              description="Admin dapat mengatur grup dan anggota dari menu Konten Website."
            />
          </div>
        ) : (
          <div className="mt-6">
            {subtitleBits.length ? (
              <div className="flex justify-center">
                <div className="flex w-full max-w-5xl items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <span className="flex-none rounded-full bg-[var(--public-primary)] px-8 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-[0_16px_32px_rgba(37,99,235,0.30)]">
                    {subtitleBits[0]}
                  </span>
                </div>
              </div>
            ) : null}

            {advisorPeople.length ? (
              <div className="mt-10">
                <div className="text-center">
                  <div className="text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl">
                    DOSEN PEMBIMBING
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-12">
                  {advisorPeople.map((p) => renderAvatar(p, advisorPeople.length === 1 ? 'xl' : 'lg'))}
                </div>
              </div>
            ) : null}

            <div className="mt-10 text-center">
              <div className="text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-6xl">INTI</div>
            </div>

            {corePeople.length ? (
              (() => {
                const leader = pickLeader(corePeople);
                const rest = corePeople.filter((p) => p.id !== leader?.id);
                const vices = rest.filter((p) => String(p.role ?? '').toLowerCase().includes('wakil')).slice(0, 2);
                const rest2 = rest.filter((p) => !vices.some((x) => x.id === p.id));
                const mid = rest2.slice(0, 4);
                const tail = rest2.slice(4);
                return (
                  <div className="mt-10">
                    <div className="grid grid-cols-1 justify-items-center gap-10 sm:grid-cols-5 sm:gap-x-0 sm:gap-y-12">
                      {leader ? <div className="sm:col-start-3">{renderAvatar(leader, 'xl')}</div> : null}
                      {vices[0] ? <div className="sm:col-start-2">{renderAvatar(vices[0], 'lg')}</div> : null}
                      {vices[1] ? <div className="sm:col-start-4">{renderAvatar(vices[1], 'lg')}</div> : null}
                      {mid[0] ? <div className="sm:col-start-1">{renderAvatar(mid[0], 'md')}</div> : null}
                      {mid[1] ? <div className="sm:col-start-2">{renderAvatar(mid[1], 'md')}</div> : null}
                      {mid[2] ? <div className="sm:col-start-4">{renderAvatar(mid[2], 'md')}</div> : null}
                      {mid[3] ? <div className="sm:col-start-5">{renderAvatar(mid[3], 'md')}</div> : null}
                    </div>
                    {tail.length ? (
                      <div className="mt-12 grid grid-cols-2 justify-items-center gap-8 sm:grid-cols-4 lg:grid-cols-6">
                        {tail.map((p) => renderAvatar(p, 'md'))}
                      </div>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              <PublicEmptyState
                variant="search"
                title="Belum ada data inti"
                description="Tambahkan anggota inti dari menu Konten Website."
              />
            )}

            <div className="mt-16 text-center">
              <div className="text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-6xl">BIDANG</div>
            </div>

            {bidangGroups.length ? (
              <div className="mt-8">
                <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:justify-center sm:overflow-visible">
                  {bidangGroups.map((g: any) => {
                    const active = g.id === activeId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveId(g.id)}
                        className={[
                          'flex-none rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition ring-1 ring-inset',
                          active
                            ? 'bg-[var(--public-primary)] text-white ring-[var(--public-primary)] shadow-[0_12px_22px_rgba(37,99,235,0.28)]'
                            : 'bg-white text-[var(--public-primary)] ring-[var(--public-primary)]/25 hover:ring-[var(--public-primary)]/55',
                        ].join(' ')}
                      >
                        {g.title}
                      </button>
                    );
                  })}
                </div>

                {activeGroup && (activeGroup.members ?? []).length ? (
                  (() => {
                    const people = sortedMembers(activeGroup.members ?? []);
                    const leader = pickLeader(people);
                    const rest = people.filter((p) => p.id !== leader?.id);
                    const divisiHeads = rest.filter((p) => String(p.role ?? '').toLowerCase().includes('kadiv'));
                    const staff = rest.filter((p) => !divisiHeads.some((x) => x.id === p.id));
                    const panel = (
                      <>
                        <div className="flex justify-center">{leader ? renderAvatar(leader, 'xl') : null}</div>

                        {divisiHeads.length ? (
                          <div className="mt-14 text-center">
                            <div className="text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-6xl">DIVISI</div>
                            <div className="mt-8 flex flex-wrap justify-center gap-10">
                              {divisiHeads.map((p) => renderAvatar(p, 'lg'))}
                            </div>
                          </div>
                        ) : null}

                        {staff.length ? (
                          <div className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-12">
                            {staff.map((p) => renderAvatar(p, 'md'))}
                          </div>
                        ) : null}
                      </>
                    );

                    if (reducedMotion) {
                      return (
                        <div key={activeId} className="mt-10">
                          {panel}
                        </div>
                      );
                    }

                    return (
                      <AnimatePresence mode="wait" initial={false}>
                        <m.div
                          key={activeId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={fadeTransition(false)}
                          className="mt-10"
                        >
                          {panel}
                        </m.div>
                      </AnimatePresence>
                    );
                  })()
                ) : (
                  <PublicEmptyState
                    variant="search"
                    title="Anggota belum diisi"
                    description="Pilih bidang lain atau tambahkan anggota dari Konten Website."
                  />
                )}
              </div>
            ) : (
              <PublicEmptyState
                variant="global"
                title="Belum ada bidang"
                description="Tambahkan grup bidang/divisi dari menu Konten Website."
              />
            )}
          </div>
        )}
      </PublicReveal>
    </PublicLayout>
  );
}
