import { CmsPreviewAside } from '@/components/ui/CmsPreviewAside';

export default function PublicSiteRecruitmentPreview({
  title,
  dateRange,
  description,
  formUrl,
  posterImageUrl,
  isPublished,
  committeeCount,
  contactsCount,
}: {
  title?: string;
  dateRange?: string;
  description?: string;
  formUrl?: string;
  posterImageUrl?: string;
  isPublished?: boolean;
  committeeCount?: number;
  contactsCount?: number;
}) {
  return (
    <CmsPreviewAside title="Pratinjau recruitment">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700">
          <div className="aspect-[4/5] w-full bg-slate-100 dark:bg-zinc-900">
            {posterImageUrl ? (
              <img src={posterImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">Poster</div>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-slate-900 dark:text-white">{title || 'Judul recruitment'}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPublished ? 'Publik' : 'Draft'}
          </span>
        </div>
        {dateRange ? <p className="text-xs text-indigo-600">{dateRange}</p> : null}
        <p className="line-clamp-4 text-xs text-slate-600 dark:text-zinc-400">{description?.trim() || 'Deskripsi…'}</p>
        {formUrl ? (
          <span className="inline-block rounded-lg bg-[var(--public-primary,#2563eb)] px-3 py-2 text-xs font-semibold text-white">
            Daftar sekarang
          </span>
        ) : null}
        <p className="text-[10px] text-slate-500">
          Panitia: {committeeCount ?? 0} · Kontak: {contactsCount ?? 0}
        </p>
      </div>
    </CmsPreviewAside>
  );
}
