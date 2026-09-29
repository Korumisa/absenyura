import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicCoverImage from '@/components/PublicCoverImage';
import type { PublicStructureGroup } from '@/types/publicSite';
import { HorizontalSnapRail } from './HorizontalSnapRail';
import { getDivisionDisplayTitle, getDivisionTagline } from './divisionUtils';
import { PublicSectionOrnament } from '@/components/public/PublicSectionOrnament';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

const AUTOPLAY_MS = 3500;
const INTERACT_PAUSE_MS = 5000;

export function DivisionRail({
  label,
  groups,
  centerWhenFits = false,
  autoplay = true,
}: {
  label?: string;
  groups: PublicStructureGroup[];
  centerWhenFits?: boolean;
  autoplay?: boolean;
}) {
  const reducedMotion = useReducedMotion();
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
  const autoDir = useRef<1 | -1>(1);
  const pauseUntil = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fits, setFits] = useState(false);

  const recalc = useCallback(() => {
    offsets.current = groupRefs.current.map((el) => el?.offsetLeft ?? 0);
  }, []);

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setFits(true);
      return;
    }
    setFits(el.scrollWidth - el.clientWidth <= 4);
  }, []);

  const updateActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !offsets.current.length) {
      syncEdges();
      return;
    }
    const left = el.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < offsets.current.length; i++) {
      const d = Math.abs(offsets.current[i] - left);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setActiveIdx((prev) => (prev === best ? prev : best));
    syncEdges();
  }, [syncEdges]);

  useEffect(() => {
    setActiveIdx(0);
    autoDir.current = 1;
    const id = requestAnimationFrame(() => {
      recalc();
      updateActive();
    });
    const onResize = () => {
      recalc();
      updateActive();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [ordered, recalc, updateActive]);

  const onScroll = useCallback(() => {
    if (rafScroll.current) return;
    rafScroll.current = requestAnimationFrame(() => {
      rafScroll.current = null;
      updateActive();
    });
  }, [updateActive]);

  const setScroller = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerRef.current = el;
      requestAnimationFrame(() => {
        recalc();
        updateActive();
      });
    },
    [recalc, updateActive],
  );

  const scrollByCards = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Smaller step = softer autoplay advance
    const step = Math.min(Math.round(el.clientWidth * 0.55), 380);
    const max = el.scrollWidth - el.clientWidth;
    let target = el.scrollLeft + dir * step;
    if (target <= 0) {
      target = 0;
      autoDir.current = 1;
    } else if (target >= max) {
      target = max;
      autoDir.current = -1;
    }
    el.scrollTo({ left: target, behavior: 'smooth' });
    const started = performance.now();
    const tick = () => {
      syncEdges();
      updateActive();
      if (performance.now() - started < 700) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [syncEdges, updateActive]);

  const bumpInteractPause = useCallback(() => {
    pauseUntil.current = performance.now() + INTERACT_PAUSE_MS;
  }, []);

  useEffect(() => {
    if (!autoplay || reducedMotion || fits) return;
    const id = window.setInterval(() => {
      if (performance.now() < pauseUntil.current) return;
      const el = scrollerRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      if (el.scrollLeft >= max - 4) autoDir.current = -1;
      else if (el.scrollLeft <= 4) autoDir.current = 1;
      scrollByCards(autoDir.current);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, reducedMotion, fits, ordered, scrollByCards]);

  if (!ordered.length) return null;

  const showLabel = Boolean(label?.trim());
  const centered = centerWhenFits && fits;

  return (
    <div className="min-w-0">
      <div className="mx-auto max-w-3xl text-center">
        {showLabel ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--public-primary)]">
            {label}
          </p>
        ) : null}
        <div className={showLabel ? 'mt-4' : ''}>
          <div className="rail-title-swap">
            {ordered.map((g, i) => {
              const t = getDivisionDisplayTitle(g.title ?? '');
              const isActive = i === activeIdx;
              return (
                <div
                  key={g.id ?? `t-${i}`}
                  className={[
                    'text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl',
                    isActive ? 'is-active' : '',
                  ].join(' ')}
                  aria-hidden={!isActive}
                >
                  <span className="text-[var(--public-primary)]">{t}</span>
                </div>
              );
            })}
          </div>
          <PublicSectionOrnament wide compact className="mt-3" />
          <div className="rail-tagline-swap mt-3">
            {ordered.map((g, i) => {
              const t = getDivisionDisplayTitle(g.title ?? '');
              const tg = String(g.description ?? '').trim() || getDivisionTagline(t);
              const isActive = i === activeIdx;
              return (
                <p
                  key={g.id ?? `tg-${i}`}
                  className={[
                    'text-sm text-muted-foreground',
                    isActive ? 'is-active' : '',
                  ].join(' ')}
                  aria-hidden={!isActive}
                >
                  {tg}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative mt-5 min-w-0 sm:mt-6">
        <HorizontalSnapRail
          ariaLabel={label || 'Struktur fungsionaris'}
          setScroller={setScroller}
          onScroll={onScroll}
          onUserInteract={bumpInteractPause}
        >
          <div className={['flex w-max gap-3 px-1 sm:gap-4', centered ? 'mx-auto' : ''].join(' ')}>
            {ordered.map((group, gi) => {
              const members = (group.members ?? []).slice(0, 8);
              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    groupRefs.current[gi] = el;
                  }}
                  className="flex shrink-0 gap-3 sm:gap-4"
                >
                  {members.map((m) => {
                    const initial = String(m.name ?? '').trim().slice(0, 1).toUpperCase() || 'A';
                    return (
                      <Link
                        key={m.id}
                        to="/struktur-organisasi"
                        draggable={false}
                        className="relative w-[152px] shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-[168px]"
                      >
                        <div className="relative aspect-[3/4] w-full">
                          {m.photo_url ? (
                            <PublicCoverImage
                              url={m.photo_url}
                              alt={m.name}
                              imgClassName="object-cover pointer-events-none select-none"
                              displayWidth={360}
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-3xl font-bold text-slate-400">
                              {initial}
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2.5 pt-8">
                            <div className="truncate text-sm font-semibold text-white">{m.role}</div>
                            <div className="truncate text-xs text-white/85">{m.name}</div>
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
