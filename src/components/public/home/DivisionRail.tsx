import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicCoverImage from '@/components/PublicCoverImage';
import { useReducedMotion } from '@/lib/useReducedMotion';
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
  const [activeTitle, setActiveTitle] = useState(() => getDivisionDisplayTitle(ordered[0]?.title ?? ''));
  const reducedMotion = useReducedMotion();

  const recalc = () => {
    offsets.current = groupRefs.current.map((el) => el?.offsetLeft ?? 0);
  };

  const updateActive = () => {
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
    const next = getDivisionDisplayTitle(ordered[best]?.title ?? '');
    if (next && next !== activeTitle) setActiveTitle(next);
  };

  useEffect(() => {
    setActiveTitle(getDivisionDisplayTitle(ordered[0]?.title ?? ''));
    requestAnimationFrame(() => {
      recalc();
      updateActive();
    });
    const onResize = () => {
      recalc();
      updateActive();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ordered.length]);

  const onScroll = () => {
    if (rafScroll.current) return;
    rafScroll.current = requestAnimationFrame(() => {
      rafScroll.current = null;
      updateActive();
    });
  };

  if (!ordered.length) return null;

  const tagline = getDivisionTagline(activeTitle);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center rounded-full bg-[var(--public-primary)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--public-primary)]">
          {label}
        </div>
        <div className="mt-5">
          <div
            key={activeTitle}
            className={[
              'text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl',
              reducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300',
            ].join(' ')}
          >
            <span className="text-[var(--public-primary)]">{activeTitle}</span>
          </div>
          <div className="relative mx-auto mt-4 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-[var(--public-primary)]/35 to-transparent" />
          <p
            key={tagline}
            className={[
              'mt-3 text-sm font-medium text-muted-foreground',
              reducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-1 duration-300',
            ].join(' ')}
          >
            {tagline}
          </p>
        </div>
      </div>

      <div className="mt-8 relative -mr-4 pr-4 sm:-mr-6 sm:pr-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-50/95 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50/95 to-transparent" />
        <HorizontalSnapRail
          ariaLabel={label}
          setScroller={(el) => {
            scrollerRef.current = el;
          }}
          onScroll={onScroll}
        >
          <div className="flex w-max gap-8 px-2">
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
                        className="group relative w-[240px] shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/25 sm:w-[260px]"
                      >
                        <div className="relative aspect-[4/5] w-full bg-slate-100">
                          {m.photo_url ? (
                            <PublicCoverImage
                              url={m.photo_url}
                              alt={m.name}
                              imgClassName="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.02))]">
                              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/80 text-4xl font-extrabold text-[var(--public-primary)] ring-1 ring-black/10">
                                {initial}
                              </div>
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <div className="truncate text-sm font-extrabold tracking-tight text-white">{m.role}</div>
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

