import { Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Banner saat profil publik belum diisi — beranda tidak terlihat "rusak" */
export function PublicHomeCmsHint() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 pb-6 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-dashed border-[var(--public-primary)]/35 bg-[var(--public-primary)]/5 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex gap-3">
          <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--public-primary)]" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-slate-900">Website sedang disiapkan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Admin dapat melengkapi logo, foto hero, dan teks organisasi di Konten Website agar beranda tampil lengkap.
            </p>
          </div>
        </div>
        <Link
          to="/login"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-slate-900 transition hover:border-[var(--public-primary)]/40 sm:mt-0"
        >
          Masuk sebagai admin
        </Link>
      </div>
    </div>
  );
}

