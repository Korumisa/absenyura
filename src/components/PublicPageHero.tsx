import React from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

export default function PublicPageHero({
  top,
  bottom,
  subtitle,
  children,
  compact = false,
}: {
  top: string;
  bottom: string;
  subtitle?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const blobClassLeft =
    'pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/14 blur-3xl';
  const blobClassRight =
    'pointer-events-none absolute -right-28 bottom-6 h-80 w-80 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/12 blur-3xl';

  return (
    <section
      className={`relative overflow-hidden bg-white ${compact ? 'py-7 sm:py-8' : 'py-12 sm:py-14'}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_15%,rgba(37,99,235,0.14),transparent_56%),radial-gradient(circle_at_78%_10%,rgba(56,189,248,0.10),transparent_60%)]" />
      {reducedMotion ? (
        <>
          <div className={blobClassLeft} aria-hidden="true" />
          <div className={blobClassRight} aria-hidden="true" />
        </>
      ) : (
        <>
          <m.div
            className={blobClassLeft}
            aria-hidden="true"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
          />
          <m.div
            className={blobClassRight}
            aria-hidden="true"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 7.5, ease: 'easeInOut', repeat: Infinity }}
          />
        </>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`mx-auto max-w-3xl rounded-3xl border border-black/10 bg-white/75 text-center shadow-[0_24px_60px_-48px_rgba(15,23,42,0.45)] backdrop-blur ${
            compact ? 'px-5 py-6 sm:px-7 sm:py-7' : 'px-5 py-8 sm:px-8 sm:py-10'
          }`}
        >
          <div
            className={`font-display italic tracking-tight text-slate-900 ${
              compact ? 'text-3xl sm:text-4xl md:text-5xl' : 'text-4xl sm:text-5xl md:text-6xl'
            }`}
          >
            {top}
          </div>
          <div
            className={`font-extrabold uppercase tracking-tight text-[var(--public-primary)] ${
              compact
                ? '-mt-1 text-3xl sm:-mt-1.5 sm:text-4xl md:text-5xl'
                : '-mt-1 text-4xl sm:-mt-2 sm:text-5xl md:text-6xl'
            }`}
          >
            {bottom}
          </div>
          {subtitle ? (
            <div
              className={`mx-auto max-w-2xl text-sm leading-relaxed text-slate-700 ${compact ? 'mt-3' : 'mt-4'}`}
            >
              {subtitle}
            </div>
          ) : null}
          {children ? (
            <div
              className={`mx-auto flex flex-wrap justify-center gap-3 ${compact ? 'mt-5' : 'mt-7'}`}
            >
              {children}
            </div>
          ) : null}
        </div>
        <div className={`relative mx-auto max-w-3xl ${compact ? 'mt-5 h-7' : 'mt-8 h-10'}`}>
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/14 blur-2xl ${
              compact ? 'h-8 w-44' : 'h-10 w-56'
            }`}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[var(--public-primary)]/35 to-transparent" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--public-primary)]/70" />
        </div>
      </div>
    </section>
  );
}
