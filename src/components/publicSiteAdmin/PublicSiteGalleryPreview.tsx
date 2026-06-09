import { CmsPreviewAside } from '@/components/ui/CmsPreviewAside';

type Item = { imageUrl: string; caption: string };

export default function PublicSiteGalleryPreview({
  title,
  description,
  isPublished,
  items = [],
}: {
  title?: string;
  description?: string;
  isPublished?: boolean;
  items?: Item[];
}) {
  const photos = items.filter((x) => x.imageUrl.trim()).slice(0, 6);

  return (
    <CmsPreviewAside title="Pratinjau album">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-foreground">{title || 'Judul album'}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-muted-foreground'
            }`}
          >
            {isPublished ? 'Publik' : 'Draft'}
          </span>
        </div>
        {description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : null}
        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground border-border">
            Belum ada foto
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((it, idx) => (
              <div key={idx} className="overflow-hidden rounded-lg bg-slate-100 bg-background">
                <img
                  src={it.imageUrl}
                  alt={
                    it.caption
                      ? `Foto album: ${it.caption}`
                      : title
                        ? `Foto album: ${title}`
                        : 'Foto album'
                  }
                  className="aspect-video w-full object-cover"
                />
                {it.caption ? (
                  <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                    {it.caption}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </CmsPreviewAside>
  );
}
