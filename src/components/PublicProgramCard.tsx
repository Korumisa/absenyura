import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicProgram } from '@/types/publicSite';

type PublicProgramCardProps = {
  program: PublicProgram;
  index?: number;
  className?: string;
};

export default function PublicProgramCard({ program, index = 0, className }: PublicProgramCardProps) {
  const blobA =
    index % 3 === 0 ? 'bg-[var(--public-primary)]/16' : index % 3 === 1 ? 'bg-sky-400/14' : 'bg-indigo-400/14';
  const blobB =
    index % 3 === 0 ? 'bg-sky-400/10' : index % 3 === 1 ? 'bg-[var(--public-primary)]/10' : 'bg-emerald-400/10';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 hover:shadow-[0_30px_70px_-52px_rgba(15,23,42,0.55)] active:scale-[0.99] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_45px_-42px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_30px_70px_-52px_rgba(0,0,0,0.85)]',
        className
      )}
    >
      <div className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] blur-2xl ${blobA}`} />
      <div className={`pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] blur-3xl ${blobB}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--public-primary)]/25 to-transparent" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--public-primary)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                {program.date_range ?? '-'}
              </span>
            </div>
            <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2 dark:text-white">
              {program.title}
            </div>
          </div>

          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/10 bg-white/70 text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            <ArrowUpRight size={18} />
          </div>
        </div>

        {program.description ? (
          <div className="mt-3 text-sm leading-relaxed text-slate-700 line-clamp-4 dark:text-slate-300">
            {program.description}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">Deskripsi belum diisi.</div>
        )}
      </div>
    </div>
  );
}

