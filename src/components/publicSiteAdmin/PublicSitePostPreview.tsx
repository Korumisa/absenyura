import { CmsPreviewAside } from '@/components/ui/CmsPreviewAside';
import type { PublicPostType } from '@/types/publicSite';

const TYPE_LABEL: Record<PublicPostType, string> = {
  BERITA: 'Berita',
  KEGIATAN: 'Kegiatan',
  LOMBA: 'Lomba',
  PENGUMUMAN: 'Pengumuman',
};

export default function PublicSitePostPreview({
  type,
  title,
  excerpt,
  dateLabel,
  coverImageUrl,
  isPublished,
}: {
  type?: PublicPostType;
  title?: string;
  excerpt?: string;
  dateLabel?: string;
  coverImageUrl?: string;
  isPublished?: boolean;
}) {
  return (
    <CmsPreviewAside title="Pratinjau konten">
      <article className="overflow-hidden rounded-xl border border-border">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title ? `Pratinjau cover: ${title}` : 'Pratinjau gambar cover'}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-slate-100 text-xs text-muted-foreground bg-background">
            Tanpa cover
          </div>
        )}
        <div className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {type ? (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                {TYPE_LABEL[type]}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isPublished
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-muted-foreground'
              }`}
            >
              {isPublished ? 'Publik' : 'Draft'}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-foreground">{title || 'Judul konten'}</h3>
          {dateLabel ? <p className="mt-1 text-[10px] text-muted-foreground">{dateLabel}</p> : null}
          <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">
            {excerpt?.trim() || 'Ringkasan konten…'}
          </p>
        </div>
      </article>
    </CmsPreviewAside>
  );
}
