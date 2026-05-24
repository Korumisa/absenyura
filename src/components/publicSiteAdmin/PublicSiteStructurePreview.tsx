import { CmsPreviewAside } from '@/components/ui/CmsPreviewAside';

type GroupPreview = {
  title: string;
  isCore: boolean;
  people: { name: string; role: string; photoUrl: string; isSpotlight: boolean }[];
};

export default function PublicSiteStructurePreview({ groups }: { groups: GroupPreview[] }) {
  const visible = groups.filter((g) => g.title.trim() || g.people.some((p) => p.name.trim()));

  return (
    <CmsPreviewAside title="Pratinjau struktur">
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-muted-foreground">Belum ada grup. Tambahkan grup di editor.</p>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {visible.map((g, gi) => (
            <div key={gi} className="rounded-xl border border-border p-3 border-border">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{g.title || 'Grup tanpa nama'}</p>
                {g.isCore ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Inti
                  </span>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2">
                {g.people
                  .filter((p) => p.name.trim() || p.role.trim())
                  .map((p, pi) => (
                    <li key={pi} className="flex items-center gap-2">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 bg-muted">
                        {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-zinc-200">{p.name || '—'}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{p.role || 'Jabatan'}</p>
                      </div>
                      {p.isSpotlight ? (
                        <span className="text-[10px] font-semibold text-amber-600" title="Spotlight">
                          ★
                        </span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CmsPreviewAside>
  );
}
