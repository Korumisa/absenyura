import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils/utils';
import type { PublicProgram } from '@/types/publicSite';

type PublicProgramCardProps = {
  program: PublicProgram;
  index?: number;
  className?: string;
};

function getProgramCardSummary(description: string | null) {
  const raw = String(description ?? '').trim();
  if (!raw) return '';
  const known = new Set([
    'divisi',
    'nama',
    'tanggal kegiatan',
    'tanggal',
    'sumber dana',
    'anggaran',
    'lokasi',
    'target',
    'sasaran',
    'rasional',
  ]);
  const lines = raw.split('\n');
  const bodyLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    const m = trimmed.match(/^([^:]{2,40})\s*:/);
    if (!m) return true;
    const key = m[1].trim().toLowerCase();
    return !known.has(key);
  });
  const body = bodyLines.join('\n').trim();
  return body || 'Rincian tersedia di halaman detail.';
}

export default function PublicProgramCard({
  program,
  index = 0,
  className,
}: PublicProgramCardProps) {
  const blobA =
    index % 3 === 0
      ? 'bg-[var(--public-primary)]/16'
      : index % 3 === 1
        ? 'bg-sky-400/14'
        : 'bg-indigo-400/14';
  const blobB =
    index % 3 === 0
      ? 'bg-sky-400/10'
      : index % 3 === 1
        ? 'bg-[var(--public-primary)]/10'
        : 'bg-emerald-400/10';
  const summary = getProgramCardSummary(program.description ?? null);

  return (
    <Link
      to={`/program-kerja/${program.id}`}
      className={cn(
        'group relative block h-full overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-left shadow-[0_18px_45px_-42px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--public-primary)]/30 hover:shadow-[0_30px_70px_-52px_rgba(15,23,42,0.55)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45',
        className
      )}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] blur-2xl ${blobA}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] blur-3xl ${blobB}`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--public-primary)]/25 to-transparent" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--public-primary)]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {program.date_range ?? '-'}
              </span>
            </div>
            <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2">
              {program.title}
            </div>
          </div>

          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-black/10 bg-white/70 text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100">
            <ArrowUpRight size={18} />
          </div>
        </div>

        {summary ? (
          <div className="mt-3 min-h-[4.875rem] text-sm leading-relaxed text-slate-700 line-clamp-3">
            {summary}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">Deskripsi singkat belum diisi.</div>
        )}
      </div>
    </Link>
  );
}
