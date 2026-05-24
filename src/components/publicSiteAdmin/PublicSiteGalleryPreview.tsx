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
          <p className="font-bold text-slate-900 dark:text-white">{title || 'Judul album'}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPublished ? 'Publik' : 'Draft'}
          </span>
        </div>
        {description ? <p className="line-clamp-2 text-xs text-slate-600 dark:text-zinc-400">{description}</p> : null}
        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-zinc-700">
            Belum ada foto
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((it, idx) => (
              <div key={idx} className="overflow-hidden rounded-lg bg-slate-100 dark:bg-zinc-900">
                <img src={it.imageUrl} alt={it.caption || ''} className="aspect-video w-full object-cover" />
                {it.caption ? <p className="truncate px-2 py-1 text-[10px] text-slate-600">{it.caption}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </CmsPreviewAside>
  );
}
