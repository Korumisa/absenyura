type DraftPreview = {
  orgName: string;
  campusName: string;
  kabinetName: string;
  kabinetPeriod: string;
  heroSubtitle: string;
  primaryColor: string;
  homeCardLeftTitle: string;
  homeCardLeftBody: string;
  homeCardRightTitle: string;
  homeCardRightBody: string;
  vision: string;
  mission: string;
  footerTagline: string;
  logoLightUrl: string;
  homeImageUrl: string;
};

/** Menyelesaikan temuan #14 — pratinjau live profil publik */
export default function PublicSiteProfilePreview({ draft }: { draft: DraftPreview }) {
  const primary = draft.primaryColor?.startsWith('#')
    ? draft.primaryColor
    : `#${draft.primaryColor || '2563eb'}`;

  return (
    <aside
      className="sticky top-4 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card"
      aria-label="Pratinjau tampilan website"
    >
      <div className="border-b border-border px-4 py-3 border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pratinjau beranda
        </p>
      </div>
      <div className="p-4" style={{ ['--public-primary' as string]: primary }}>
        <div className="mb-4 flex items-center gap-3">
          {draft.logoLightUrl ? (
            <img src={draft.logoLightUrl} alt="" className="size-10 rounded-lg object-contain" />
          ) : (
            <div className="size-10 rounded-lg bg-slate-200" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {draft.orgName || 'Nama organisasi'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {draft.campusName || 'Nama kampus'}
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl p-4 text-white"
          style={{ background: `linear-gradient(135deg, ${primary}, #4f46e5)` }}
        >
          <p className="text-xs font-semibold opacity-90">
            {draft.kabinetName || 'Kabinet'} · {draft.kabinetPeriod || 'Periode'}
          </p>
          <p className="mt-2 text-lg font-bold leading-snug">
            {draft.heroSubtitle || 'Hero subtitle akan tampil di sini'}
          </p>
        </div>

        {draft.homeImageUrl ? (
          <img
            src={draft.homeImageUrl}
            alt=""
            className="mt-4 aspect-video w-full rounded-xl object-cover"
          />
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3 border-border">
            <p className="text-xs font-bold text-[var(--public-primary)]">
              {draft.homeCardLeftTitle || 'Kartu kiri'}
            </p>
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
              {draft.homeCardLeftBody || '…'}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3 border-border">
            <p className="text-xs font-bold text-[var(--public-primary)]">
              {draft.homeCardRightTitle || 'Kartu kanan'}
            </p>
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
              {draft.homeCardRightBody || '…'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 bg-background">
          <p className="text-xs font-bold text-foreground">Visi</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{draft.vision || '—'}</p>
          <p className="text-xs font-bold text-foreground">Misi</p>
          <p className="line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">
            {draft.mission || '—'}
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          {draft.footerTagline || 'Footer tagline'}
        </p>
      </div>
    </aside>
  );
}
