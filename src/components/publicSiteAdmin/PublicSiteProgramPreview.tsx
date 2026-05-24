import { CmsPreviewAside } from '@/components/ui/CmsPreviewAside';

export default function PublicSiteProgramPreview({
  title,
  dateRange,
  description,
  isPublished,
}: {
  title?: string;
  dateRange?: string;
  description?: string;
  isPublished?: boolean;
}) {
  return (
    <CmsPreviewAside title="Pratinjau program">
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold text-slate-900 dark:text-white">{title || 'Judul program'}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPublished ? 'Publik' : 'Draft'}
          </span>
        </div>
        {dateRange ? <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">{dateRange}</p> : null}
        <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          {description?.trim() || 'Deskripsi program akan tampil di halaman Program Kerja.'}
        </p>
      </div>
    </CmsPreviewAside>
  );
}
