import React, { useMemo } from 'react';
import PublicLayout from '@/components/PublicLayout';
import PublicEnter from '@/components/PublicEnter';
import PublicReveal from '@/components/PublicReveal';
import PublicPageHero from '@/components/PublicPageHero';
import useSWR from 'swr';
import api from '@/services/api';
import type { PublicProgram } from '@/types/publicSite';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { PublicPageError } from '@/components/public/PublicPageError';

type ParsedProgram = {
  fields: Array<{ label: string; value: string }>;
  body: string | null;
};

function parseProgramDescription(description: string | null): ParsedProgram {
  const raw = String(description ?? '').trim();
  if (!raw) return { fields: [], body: null };

  const lines = raw.split('\n');
  const fields: Array<{ label: string; value: string }> = [];
  const bodyLines: string[] = [];

  const known = new Map<string, string>([
    ['divisi', 'Divisi'],
    ['nama', 'Nama'],
    ['tanggal kegiatan', 'Tanggal Kegiatan'],
    ['tanggal', 'Tanggal'],
    ['sumber dana', 'Sumber Dana'],
    ['anggaran', 'Anggaran'],
    ['lokasi', 'Lokasi'],
    ['target', 'Target'],
    ['sasaran', 'Target'],
    ['rasional', 'Rasional'],
  ]);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      bodyLines.push('');
      continue;
    }
    const m = trimmed.match(/^([^:]{2,40})\s*:\s*(.+)$/);
    if (!m) {
      bodyLines.push(line);
      continue;
    }
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    const label = known.get(key);
    if (!label) {
      bodyLines.push(line);
      continue;
    }
    if (label === 'Rasional') {
      bodyLines.push(value);
      continue;
    }
    fields.push({ label, value });
  }

  const body = bodyLines.join('\n').trim() || null;
  return { fields, body };
}

export default function ProgramKerjaDetail() {
  const { id } = useParams();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const swr = useSWR<PublicProgram[]>('/public-site/programs', fetcher, { revalidateOnFocus: false });
  const { data: items = [], isInitialLoading: isLoading, isError, retry } = useSwrPageState(swr);

  const program = useMemo(() => items.find((p) => p.id === id) ?? null, [items, id]);
  const parsed = useMemo(() => parseProgramDescription(program?.description ?? null), [program?.description]);
  if (isError) {
    return <PublicPageError title="Gagal memuat program" error={swr.error} onRetry={retry} />;
  }

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicPageHero top="Program" bottom="Kerja" subtitle="Detail program kerja yang dipublikasikan." />

        <PublicReveal className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mt-8">
            <Link
              to="/program-kerja"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--public-primary)]/30 hover:text-[var(--public-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/45"
            >
              <ArrowLeft size={18} />
              Kembali
            </Link>
          </div>

          {!program ? (
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-left text-sm text-muted-foreground sm:p-10">
              <div className="pointer-events-none absolute -left-16 -top-16 size-52 rounded-[48%_52%_58%_42%/44%_43%_57%_56%] bg-[var(--public-primary)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 size-56 rounded-[53%_47%_45%_55%/48%_56%_44%_52%] bg-sky-400/10 blur-3xl" />
              <div className="relative">
                <div className="text-base font-extrabold tracking-tight text-slate-900">Program tidak ditemukan</div>
                <div className="mt-2 max-w-2xl">Kemungkinan data belum termuat atau program sudah dihapus.</div>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)]">
                <div className="border-b border-black/10 px-4 py-5 sm:px-6">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{program.date_range ?? '-'}</div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{program.title}</div>
                </div>
                <div className="p-4 sm:p-6">
                  {parsed.body ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{parsed.body}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Deskripsi belum diisi.</div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_22px_56px_-48px_rgba(15,23,42,0.45)]">
                <div className="border-b border-black/10 px-4 py-5 sm:px-6">
                  <div className="text-sm font-extrabold tracking-tight text-slate-900">Rincian</div>
                  <div className="mt-1 text-sm text-muted-foreground">Ditampilkan dari data yang diatur di admin panel.</div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{program.date_range ?? '-'}</div>
                    </div>
                    {parsed.fields.length > 0 ? (
                      <div className="space-y-3">
                        {parsed.fields.map((f) => (
                          <div key={`${f.label}-${f.value}`} className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{f.label}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {parsed.fields.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 px-4 py-4 text-sm text-muted-foreground">
                        Untuk menampilkan rincian seperti sumber dana/target/lokasi, admin bisa menulis format: “Sumber Dana: …” pada Deskripsi.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </PublicReveal>
      </PublicEnter>
    </PublicLayout>
  );
}
