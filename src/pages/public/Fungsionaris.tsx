import React, { useEffect, useMemo, useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import type { PublicProfile, PublicStructureGroup } from '@/types/publicSite';
import { Skeleton } from '@/components/ui/skeleton';
import PublicPageHero from '@/components/PublicPageHero';
import PublicCoverImage from '@/components/PublicCoverImage';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import { useMockOrSwr } from '@/hooks/useMockOrSwr';
import { mockStructure, mockProfile } from '@/lib/utils/mockLandingData';
import { publicSiteFetcher } from '@/lib/utils/publicSiteFetcher';
import { safeRelation } from '@/lib/utils/publicContent';
import { PublicPageError } from '@/components/public/PublicPageError';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import { PublicSectionOrnament } from '@/components/public/PublicSectionOrnament';
import { CabinetPeriodSwitcher } from '@/components/public/home/CabinetPeriodSwitcher';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import { PublicPageMeta } from '@/components/public/PublicPageMeta';

type StructureResp = { data: PublicStructureGroup[]; cabinet: any; allCabinets: any[] };

export default function Fungsionaris() {
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const structureResult = useMockOrSwr<StructureResp>({
    swrKey: `/public-site/structure?v=2${
      selectedCabinetId ? `&cabinetId=${encodeURIComponent(selectedCabinetId)}` : ''
    }`,
    fetcher: (u) => publicSiteFetcher<StructureResp>(u, { kind: 'top' }),
    swrConfig: {
      errorRetryCount: 2,
      errorRetryInterval: 1200,
      dedupingInterval: 8_000,
      keepPreviousData: true,
      revalidateOnReconnect: true,
      onErrorRetry: (err, _key, _config, revalidate, revalidateOpts) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 429) {
          return;
        }
        void revalidate(revalidateOpts);
      },
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

  const allCabinets = useMemo(() => structureData?.allCabinets ?? [], [structureData]);
  const selectedCabinet = structureData?.cabinet ?? null;
  
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
        ? 'h-52 w-52 sm:h-64 sm:w-64'
        : size === 'lg'
          ? 'h-40 w-40 sm:h-52 sm:w-52'
          : 'h-28 w-28 sm:h-40 sm:w-40';
    const displayWidth = size === 'xl' ? 512 : size === 'lg' ? 416 : 320;
    return (
      <div
        key={p.id}
        className={`flex min-w-0 w-full shrink-0 flex-col items-center text-center break-words ${size === 'xl' ? 'max-w-[280px]' : size === 'lg' ? 'max-w-[240px]' : 'max-w-[190px]'}`}
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
      <PublicPageMeta
        title="Struktur Organisasi & Fungsionaris"
        description="Susunan pengurus kabinet, struktur organisasi, dan biodata fungsionaris HM SDP Undiksha untuk periode berjalan."
        path="/struktur-organisasi"
      />
      <PublicLoadingOverlay show={isLoading} label="Memuat fungsionaris..." />
      <PublicEnter>
        <PublicPageHero
          top="Susunan"
          bottom="Fungsionaris"
          subtitle="Struktur kepengurusan organisasi periode aktif."
          compact
        >
          {subtitleBits.length ? (
            <p className="pt-1 text-sm font-medium text-slate-600">
              {subtitleBits.join(' · ')}
            </p>
          ) : null}
        </PublicPageHero>
      </PublicEnter>

      {allCabinets.length > 1 && (
        <PublicEnter>
          <div className="mx-auto max-w-7xl px-4 pb-2 pt-1 sm:px-6">
            <CabinetPeriodSwitcher
              cabinets={allCabinets}
              selectedId={cabinet?.id}
              onSelect={setSelectedCabinetId}
            />
          </div>
        </PublicEnter>
      )}

      <PublicReveal eager className="mx-auto w-full max-w-full overflow-x-hidden px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-x-hidden">
        {isLoading ? (
          <div className="mt-2 space-y-10">
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
          <div className="mt-2">
            <PublicEmptyState
              variant="global"
              title="Struktur organisasi belum diatur"
              description="Admin dapat mengatur grup dan anggota dari menu Konten Website."
            />
          </div>
        ) : (
          <div className="mt-1">
            {advisorPeople.length ? (
              <div className="mt-4 sm:mt-5">
                <div className="text-center">
                  <PublicSectionOrnament wide compact className="mb-3" />
                  <div className="text-3xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-4xl">
                    Dosen Pembimbing
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-12">
                  {advisorPeople.map((p) => renderAvatar(p, advisorPeople.length === 1 ? 'xl' : 'lg'))}
                </div>
              </div>
            ) : null}

            <div className={`${advisorPeople.length ? 'mt-10 sm:mt-12' : 'mt-4 sm:mt-5'} text-center`}>
              <PublicSectionOrnament wide compact className="mb-3" />
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
                      <div className="mt-12 grid w-full grid-cols-2 items-start justify-items-center gap-6 sm:grid-cols-3 lg:grid-cols-4">
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

            <div className="mt-12 text-center sm:mt-14">
              <PublicSectionOrnament wide compact className="mb-3" />
              <div className="text-4xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:text-5xl">
                Bidang
              </div>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-medium text-muted-foreground">
                Divisi dan bidang pendukung untuk eksekusi program kerja.
              </p>
            </div>

            {bidangGroups.length ? (
              <div className="mt-8">
                <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-1 gap-y-1">
                  {bidangGroups.map((g: any) => {
                    const active = g.id === activeId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveId(g.id)}
                        className={[
                          'min-h-10 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/40 sm:px-4',
                          active
                            ? 'text-[var(--public-primary)]'
                            : 'text-slate-600 hover:text-slate-900',
                        ].join(' ')}
                      >
                        <span className="relative inline-block pb-[3px]">
                          {g.title}
                          <span
                            aria-hidden
                            className={`pointer-events-none absolute inset-x-0 bottom-0 h-[1px] origin-left bg-[var(--public-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              active ? 'scale-x-100' : 'scale-x-0'
                            }`}
                          />
                        </span>
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
                            <PublicSectionOrnament wide compact className="mb-3" />
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

                    return (
                      <div
                        key={activeId}
                        className={`mt-10 min-h-[22rem] ${
                          reducedMotion ? '' : 'animate-[taglineFadeIn_320ms_ease-out_both]'
                        }`}
                      >
                        {panel}
                      </div>
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
