import React, { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import type { PublicProfile, PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import { AnimatePresence, m } from 'framer-motion';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';
import { fadeTransition } from '@/lib/perf/motionPresets';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockStructure, mockProfile } from '@/lib/utils/mockLandingData';
import { publicSiteFetcher } from '@/lib/utils/publicSiteFetcher';
import { safeRelation } from '@/lib/utils/publicContent';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import { PublicSectionOrnament } from '@/components/public/PublicSectionOrnament';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';

type StructureResp = { data: PublicStructureGroup[]; cabinet: any; allCabinets: any[] };

export default function Fungsionaris() {
  const structureResult = useMockOrSwr<StructureResp>({
    swrKey: '/public-site/structure?v=2',
    fetcher: (u) => publicSiteFetcher<StructureResp>(u, { kind: 'top' }),
    swrConfig: {
      errorRetryCount: 2,
      errorRetryInterval: 1500,
      dedupingInterval: 10_000,
    },
    mockStatic: mockStructure as StructureResp,
  });
  const { swr: structureSwr, data: structureData, isInitialLoading: isLoading, isError, retry } = structureResult;
  const profileResult = useMockOrSwr<PublicProfile | null>({
    swrKey: '/public-site/profile',
    fetcher: publicSiteFetcher<PublicProfile | null>,
    mockStatic: mockProfile,
  });
  const profile = profileResult.data ?? null;
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  
  const allCabinets = useMemo(() => structureData?.allCabinets ?? [], [structureData]);
  const activeCabinet = structureData?.cabinet;
  const selectedCabinet = useMemo(() => {
    if (selectedCabinetId) {
      return allCabinets.find(c => c.id === selectedCabinetId);
    }
    return activeCabinet;
  }, [allCabinets, selectedCabinetId, activeCabinet]);
  
  const groups = useMemo(() => safeRelation(selectedCabinet?.groups), [selectedCabinet]);
  const cabinet = selectedCabinet ?? null;
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

  const advisorGroups: PublicStructureGroup[] = useMemo(
    () => ordered.filter((g: any) => isAdvisorByTitle(g.title)) as PublicStructureGroup[],
    [ordered],
  );
  const coreGroups: PublicStructureGroup[] = useMemo(
    () =>
      ordered.filter(
        (g: any) =>
          !advisorGroups.some((x: any) => x.id === g.id) &&
          (Boolean(g.is_core) || isCoreByTitle(g.title)),
      ) as PublicStructureGroup[],
    [ordered, advisorGroups],
  );
  const bidangGroups: PublicStructureGroup[] = useMemo(
    () =>
      ordered.filter(
        (g: any) =>
          !advisorGroups.some((x: any) => x.id === g.id) &&
          !coreGroups.some((x: any) => x.id === g.id),
      ) as PublicStructureGroup[],
    [ordered, advisorGroups, coreGroups],
  );

  const [activeId, setActiveId] = useState<string>('');
  useEffect(() => {
    if (!activeId && bidangGroups.length) setActiveId(bidangGroups[0].id);
  }, [activeId, bidangGroups]);

  const activeGroup: PublicStructureGroup | null =
    bidangGroups.find((g) => g.id === activeId) ?? null;
  const kabinetName = cabinet?.name ?? profile?.kabinet_name ?? '';
  const kabinetPeriod = cabinet?.period ?? profile?.kabinet_period ?? '';
  const subtitleBits = [kabinetName, kabinetPeriod].map((x) => String(x || '').trim()).filter(Boolean);

  const sortedMembers = (members: any[]) =>
    safeRelation(members).slice().sort((a: any, b: any) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999));

  const corePeople = useMemo(() => sortedMembers(coreGroups.flatMap((g: any) => safeRelation(g.members))), [coreGroups]);
  const advisorPeopleRaw = useMemo(() => sortedMembers(advisorGroups.flatMap((g: any) => safeRelation(g.members))), [advisorGroups]);
  const advisorPeople = advisorPeopleRaw;
  const activeBidangDescription = String(activeGroup?.description ?? '').trim();
  const pickLeader = (people: PublicStructureGroup['members']) => {
    const safe = safeRelation(people);
    const spotlight = safe.find((p) => Boolean(p.is_spotlight));
    if (spotlight) return spotlight;
    const ketua = safe.find((p) => String(p.role ?? '').toLowerCase().includes('ketua'));
    if (ketua) return ketua;
    return safe[0] ?? null;
  };

  const renderAvatar = (p: any, size: 'xl' | 'lg' | 'md') => {
    const sizeClass =
      size === 'xl'
        ? 'h-36 w-36 sm:h-44 sm:w-44'
        : size === 'lg'
          ? 'h-28 w-28 sm:h-32 sm:w-32'
          : 'h-20 w-20 sm:h-24 sm:w-24';
    const displayWidth = size === 'xl' ? 352 : size === 'lg' ? 256 : 192;
    return (
      <div
        key={p.id}
        className="flex w-full max-w-[180px] shrink-0 flex-col items-center text-center break-words sm:max-w-[220px]"
      >
        <div
          className={[
            'relative shrink-0 overflow-hidden rounded-full border-[3px] border-[var(--public-primary)] bg-slate-100 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)]',
            sizeClass,
          ].join(' ')}
        >
          <PublicCoverImage
            url={p.photo_url}
            alt={p.name ?? 'Anggota'}
            imgClassName="object-cover"
            variant="avatar"
            displayWidth={displayWidth}
            priority={size === 'xl'}
          />
        </div>
        <div
          className="mt-3 w-full break-words text-sm font-extrabold leading-snug tracking-tight text-slate-900 hyphens-auto"
        >
          {p.name ?? '-'}
        </div>
        <div
          className="mt-1 w-full break-words text-xs font-semibold leading-snug text-muted-foreground hyphens-auto"
        >
          {p.role ?? '-'}
        </div>
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
          subtitle="Struktur kepengurusan organisasi periode aktif."
          compact
        />
      </PublicEnter>

      {/* Cabinet Switcher */}
      {allCabinets.length > 1 && (
        <PublicEnter>
          <div className="mx-auto max-w-7xl px-4 pb-2 pt-2 sm:px-6">
            <div
              role="tablist"
              className="flex flex-wrap items-center justify-center gap-2"
              aria-label="Pilih periode kabinet"
            >
              {allCabinets.map((cab: any) => {
                const isSelected = cabinet?.id === cab.id;
                return (
                  <button
                    key={cab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCabinetId(isSelected ? null : cab.id)}
                    className={
                      (isSelected
                        ? 'bg-[var(--public-primary)] text-white'
                        : 'border border-black/10 bg-white text-slate-900 hover:border-[var(--public-primary)]/40'
                      ) +
                      ' inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
                    }
                  >
                    {cab.name}
                    <span className="text-[10px] opacity-75">{cab.period}</span>
                    {cab.is_active && !isSelected ? (
                      <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </PublicEnter>
      )}

      <PublicReveal className="mx-auto w-full max-w-full overflow-x-hidden px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-x-hidden">
        {isLoading ? (
          <div className="mt-8 space-y-10">
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
          <div className="mt-8">
            <PublicEmptyState
              variant="global"
              title="Struktur organisasi belum diatur"
              description="Admin dapat mengatur grup dan anggota dari menu Konten Website."
            />
          </div>
        ) : (
          <div className="mt-8">
            {subtitleBits.length ? (
              <div className="flex justify-center px-1 pt-2 sm:pt-4">
                <div className="flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <span aria-hidden="true" className="flex items-center gap-1">
                    <span className="h-px w-5 bg-gradient-to-r from-transparent to-[var(--public-primary)]/55 sm:w-10" />
                    <span className="size-1 rotate-45 bg-[var(--public-primary)]/40" />
                    <span className="size-1.5 rotate-45 bg-[var(--public-primary)]/70" />
                  </span>
                  <span className="relative inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--public-primary)] px-4 py-2 text-white sm:gap-2.5 sm:px-6 sm:py-2.5">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-[2px] rounded-full border border-white/20"
                    />
                    <span className="relative truncate font-display text-sm font-semibold italic tracking-wide sm:text-[15px]">
                      {subtitleBits[0]}
                    </span>
                    {subtitleBits[1] ? (
                      <span className="relative shrink-0 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/95">
                        {subtitleBits[1]}
                      </span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className="flex items-center gap-1">
                    <span className="size-1.5 rotate-45 bg-[var(--public-primary)]/70" />
                    <span className="size-1 rotate-45 bg-[var(--public-primary)]/40" />
                    <span className="h-px w-5 bg-gradient-to-l from-transparent to-[var(--public-primary)]/55 sm:w-10" />
                  </span>
                </div>
              </div>
            ) : null}

            {advisorPeople.length ? (
              <div className="mt-12 sm:mt-14">
                <div className="text-center">
                  <PublicSectionOrnament compact className="mb-3" />
                  <div className="text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl">
                    Dosen Pembimbing
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-12">
                  {advisorPeople.map((p) => renderAvatar(p, advisorPeople.length === 1 ? 'xl' : 'lg'))}
                </div>
              </div>
            ) : null}

            <div className="mt-12 text-center sm:mt-14">
              <PublicSectionOrnament compact className="mb-3" />
              <div className="text-4xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-5xl">
                Inti
              </div>
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
                  <div className="mx-auto mt-10 w-full max-w-6xl overflow-hidden px-0 sm:px-2">
                    {/* ROW 1 — KETUA UMUM (single, centered top) */}
                    {leader ? (
                      <div className="flex w-full items-center justify-center pb-2 pt-2">
                        {renderAvatar(leader, 'xl')}
                      </div>
                    ) : null}

                    {/* ROW 2 — WAKIL KETUA UMUM (directly below leader, always centered) */}
                    {vices.length ? (
                      <div className="mt-6 flex w-full flex-wrap items-start justify-center gap-x-10 gap-y-10 sm:mt-10 sm:gap-x-12">
                        {vices.map((p) => renderAvatar(p, 'lg'))}
                      </div>
                    ) : null}

                    {/* ROW 3 — STAFF INTI (Sekretaris Jenderal, Bendahara, dll — responsive grid, NO col collision) */}
                    {mid.length ? (
                      <div className="mt-10 grid w-full grid-cols-2 items-start justify-items-center gap-6 sm:grid-cols-3 sm:gap-10 md:grid-cols-4">
                        {mid.map((p) => renderAvatar(p, 'md'))}
                      </div>
                    ) : null}

                    {/* ROW 4 — TAIL (remaining members) */}
                    {tail.length ? (
                      <div className="mt-12 grid w-full grid-cols-2 items-start justify-items-center gap-8 sm:grid-cols-4 lg:grid-cols-6">
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

            <div className="mt-14 text-center sm:mt-16">
              <PublicSectionOrnament compact className="mb-3" />
              <div className="text-4xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-5xl">
                Bidang
              </div>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-medium text-muted-foreground">
                Divisi dan bidang pendukung untuk eksekusi program kerja.
              </p>
            </div>

            {bidangGroups.length ? (
              <div className="mt-8">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-start gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap sm:justify-center sm:overflow-visible">
                  {bidangGroups.map((g: any) => {
                    const active = g.id === activeId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveId(g.id)}
                        className={[
                          'flex-none rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ring-1 ring-inset sm:px-5',
                          active
                            ? 'bg-[var(--public-primary)] text-white ring-[var(--public-primary)]'
                            : 'bg-white text-[var(--public-primary)] ring-[var(--public-primary)]/25 hover:ring-[var(--public-primary)]/55',
                        ].join(' ')}
                      >
                        {g.title}
                      </button>
                    );
                  })}
                </div>

                {activeBidangDescription ? (
                  <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-medium text-muted-foreground">
                    {activeBidangDescription}
                  </p>
                ) : null}
                {activeGroup && safeRelation(activeGroup.members).length ? (
                  (() => {
                    const people = sortedMembers(activeGroup.members);
                    const leader = pickLeader(people);
                    const rest = people.filter((p) => p.id !== leader?.id);
                    const divisiHeads = rest.filter((p) => String(p.role ?? '').toLowerCase().includes('kadiv'));
                    const staff = rest.filter((p) => !divisiHeads.some((x) => x.id === p.id));
                    const panel = (
                      <>
                        <div className="flex justify-center">{leader ? renderAvatar(leader, 'xl') : null}</div>

                        {divisiHeads.length ? (
                          <div className="mt-12 text-center sm:mt-14">
                            <PublicSectionOrnament compact className="mb-3" />
                            <div className="text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl">
                              Divisi
                            </div>
                            <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-10">
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
        </div>
      </PublicReveal>
    </PublicLayout>
  );
}
