import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicCoverImage from '@/components/PublicCoverImage';
import type { PublicStructureGroup } from '@/types/publicSite';
import { HorizontalSnapRail } from './HorizontalSnapRail';
import { getDivisionDisplayTitle, getDivisionTagline } from './divisionUtils';

export function DivisionRail({
  label,
  groups,
}: {
  label: string;
  groups: PublicStructureGroup[];
}) {
  const ordered = useMemo(
    () =>
      groups
        .slice()
        .sort((a, b) => (Number(a.sort_order ?? 999) || 999) - (Number(b.sort_order ?? 999) || 999))
        .filter((g) => (g.members ?? []).length > 0),
    [groups],
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const offsets = useRef<number[]>([]);
  const rafScroll = useRef<number | null>(null);
  const rafInitRef = useRef<number | null>(null);
  const lastActiveIdx = useRef<number>(0);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const recalc = useCallback(() => {
    offsets.current = groupRefs.current.map((el) => el?.offsetLeft ?? 0);
  }, []);

  const updateActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const list = offsets.current;
    if (!list.length) return;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      const d = Math.abs(list[i] - left);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best !== lastActiveIdx.current) {
      lastActiveIdx.current = best;
      setActiveIdx(best);
    }
  }, [scrollerRef, offsets]);

  useEffect(() => {
    lastActiveIdx.current = 0;
    setActiveIdx(0);
    rafInitRef.current = requestAnimationFrame(() => {
      rafInitRef.current = null;
      recalc();
      updateActive();
    });
    const onResize = () => {
      recalc();
      updateActive();
    };
    window.addEventListener('resize', onResize);
    const rafSnapInit = rafInitRef.current;
    const rafSnapScroll = rafScroll.current;
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafSnapInit !== null) cancelAnimationFrame(rafSnapInit);
      if (rafSnapScroll !== null) cancelAnimationFrame(rafSnapScroll);
      if (rafInitRef.current !== null) cancelAnimationFrame(rafInitRef.current);
      if (rafScroll.current !== null) cancelAnimationFrame(rafScroll.current);
      rafInitRef.current = null;
      rafScroll.current = null;
    };
  }, [ordered, updateActive, recalc]);

  const onScroll = useCallback(() => {
    if (rafScroll.current) return;
    rafScroll.current = requestAnimationFrame(() => {
      rafScroll.current = null;
      updateActive();
    });
  }, [updateActive]);

  if (!ordered.length) return null;

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
          {label}
        </div>
        <div className="mt-5">
          <div className="rail-title-swap">
            {ordered.map((g, i) => {
              const t = getDivisionDisplayTitle(g.title ?? '');
              const isActive = i === activeIdx;
              return (
                <div
                  key={g.id ?? `t-${i}`}
                  className={[
                    'text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl transition-all duration-300 ease-out',
                    isActive
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-2 scale-[0.98] pointer-events-none',
                  ].join(' ')}
                >
                  <span className="text-[var(--public-primary)]">{t}</span>
                </div>
              );
            })}
          </div>
          <div className="relative mx-auto mt-4 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-[var(--public-primary)]/35 to-transparent" />
          <div className="relative mt-3 min-h-[1.75rem]">
            {ordered.map((g, i) => {
              const t = getDivisionDisplayTitle(g.title ?? '');
              const tg = getDivisionTagline(t);
              const isActive = i === activeIdx;
              return (
                <p
                  key={g.id ?? `tg-${i}`}
                  className={[
                    'absolute inset-x-0 text-sm font-medium text-muted-foreground transition-all duration-300 ease-out',
                    isActive
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-1.5 pointer-events-none',
                  ].join(' ')}
                >
                  {tg}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 relative w-full overflow-x-clip">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-50/95 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50/95 to-transparent z-10" />
        <HorizontalSnapRail
          ariaLabel={label}
          setScroller={(el) => {
            scrollerRef.current = el;
          }}
          onScroll={onScroll}
        >
          <div className="rail-track flex w-max gap-8 px-2 sm:px-6 lg:px-8">
            {ordered.map((group, gi) => {
              const members = (group.members ?? []).slice(0, 8);
              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    groupRefs.current[gi] = el;
                  }}
                  className="flex snap-start gap-4"
                >
                  {members.map((m) => {
                    const initial = String(m.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                    return (
                      <Link
                        key={m.id}
                        to="/struktur-organisasi"
                        className="rail-card group relative w-[240px] shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[var(--public-primary)]/35 hover:shadow-[0_28px_55px_-40px_rgba(37,99,235,0.35)] sm:w-[260px]"
                      >
                        <div className="rail-card-image relative aspect-[4/5] w-full bg-slate-100 overflow-hidden">
                          {m.photo_url ? (
                            <PublicCoverImage
                              url={m.photo_url}
                              alt={m.name}
                              imgClassName="rail-card-image object-cover grayscale transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:grayscale-0 group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200">
                              <div className="grid size-20 place-items-center rounded-2xl bg-white/80 text-4xl font-extrabold text-[var(--public-primary)]/80 ring-1 ring-slate-200">
                                {initial}
                              </div>
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                          <div
                            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out [.group:hover_&]:bg-[var(--public-primary)]/10"
                          />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <div className="truncate text-sm font-extrabold tracking-tight text-white drop-shadow-sm">{m.role}</div>
                            <div className="mt-1 truncate text-xs font-semibold text-white/90">{m.name}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </HorizontalSnapRail>
      </div>
    </div>
  );
}

