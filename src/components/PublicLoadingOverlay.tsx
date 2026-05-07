import React from 'react';
import { cn } from '@/lib/utils';

export default function PublicLoadingOverlay({
  show,
  label = 'Memuat data...',
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) return null;
  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center bg-white/25 backdrop-blur-md dark:bg-zinc-950/30',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-black/10 bg-white/75 px-8 py-7 text-slate-800 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.7)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/70 dark:text-slate-100 dark:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.9)]">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-[4px] border-slate-200 border-t-[var(--public-primary)] dark:border-zinc-800" />
          <div className="absolute inset-2 rounded-full bg-[var(--public-primary)]/10" />
        </div>
        <div className="text-sm font-medium">{label}</div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--public-primary)] [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--public-primary)] [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--public-primary)]" />
        </div>
      </div>
    </div>
  );
}

