import React from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';
import { PublicSectionOrnament } from '@/components/public/PublicSectionOrnament';

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
      className={`relative overflow-hidden bg-white ${compact ? 'pb-1 pt-5 sm:pb-2 sm:pt-6' : 'pb-3 pt-10 sm:pb-4 sm:pt-12'}`}
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
          <h1 className="tracking-tight text-slate-900">
            <span
              className={`block font-display italic ${
                compact ? 'text-3xl sm:text-4xl md:text-5xl' : 'text-4xl sm:text-5xl md:text-6xl'
              }`}
            >
              {top}
            </span>
            <span
              className={`block font-extrabold uppercase text-[var(--public-primary)] ${
                compact
                  ? '-mt-1 text-3xl sm:-mt-1.5 sm:text-4xl md:text-5xl'
                  : '-mt-1 text-4xl sm:-mt-2 sm:text-5xl md:text-6xl'
              }`}
            >
              {bottom}
            </span>
          </h1>
          {subtitle ? (
            <p
              className={`mx-auto max-w-2xl text-sm leading-relaxed text-slate-700 ${compact ? 'mt-3' : 'mt-4'}`}
            >
              {subtitle}
            </p>
          ) : null}
          {children ? (
            <div
              className={`mx-auto flex flex-wrap justify-center gap-3 ${compact ? 'mt-4' : 'mt-6'}`}
            >
              {children}
            </div>
          ) : null}
        </div>
        <PublicSectionOrnament wide className={compact ? 'mt-3' : 'mt-5'} />
      </div>
    </section>
  );
}
