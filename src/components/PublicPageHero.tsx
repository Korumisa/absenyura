import React from 'react';
import { motion } from 'framer-motion';

export default function PublicPageHero({
  top,
  bottom,
  subtitle,
  children,
}: {
  top: string;
  bottom: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-white py-14 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_15%,rgba(37,99,235,0.14),transparent_56%),radial-gradient(circle_at_78%_10%,rgba(56,189,248,0.10),transparent_60%)] dark:opacity-55" />
      <motion.div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/14 blur-3xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -right-28 bottom-6 h-80 w-80 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/12 blur-3xl"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 7.5, ease: 'easeInOut', repeat: Infinity }}
      />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <div className="font-display text-4xl italic tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
            {top}
          </div>
          <div className="-mt-1 text-4xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] sm:-mt-2 sm:text-5xl md:text-6xl">
            {bottom}
          </div>
          {subtitle ? <div className="mx-auto mt-3 max-w-2xl text-sm text-slate-700 dark:text-slate-300">{subtitle}</div> : null}
          {children ? <div className="mx-auto mt-8 flex flex-wrap justify-center gap-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
