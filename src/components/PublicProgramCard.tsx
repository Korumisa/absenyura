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

export default function PublicProgramCard({ program, className }: PublicProgramCardProps) {
  const summary = getProgramCardSummary(program.description ?? null);

  return (
    <Link
      to={`/program-kerja/${program.id}`}
      className={cn(
        'group relative flex h-full flex-col border border-black/10 bg-white p-5 text-left transition hover:border-[var(--public-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {program.date_range ? (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {program.date_range}
            </p>
          ) : null}
          <h3 className="mt-2 text-base font-bold leading-snug tracking-tight text-slate-900 line-clamp-2 sm:text-lg">
            {program.title}
          </h3>
        </div>
        <ArrowUpRight
          size={18}
          className="mt-0.5 shrink-0 text-slate-400 transition group-hover:text-[var(--public-primary)]"
          aria-hidden
        />
      </div>

      {summary ? (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">{summary}</p>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Deskripsi singkat belum diisi.</p>
      )}
    </Link>
  );
}
