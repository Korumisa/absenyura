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
      <div className="rounded-2xl border border-border p-4 border-border">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold text-slate-900 dark:text-white">{title || 'Judul program'}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-muted-foreground'
            }`}
          >
            {isPublished ? 'Publik' : 'Draft'}
          </span>
        </div>
        {dateRange ? <p className="mt-1 text-xs text-brand text-brand">{dateRange}</p> : null}
        <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-muted-foreground text-muted-foreground">
          {description?.trim() || 'Deskripsi program akan tampil di halaman Program Kerja.'}
        </p>
      </div>
    </CmsPreviewAside>
  );
}
