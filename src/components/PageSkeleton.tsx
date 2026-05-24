/**
 * Fallback generik (jarang dipakai). Prefer skeleton per halaman + Suspense fallback null di App.
 */
export default function PageSkeleton() {
  return (
    <div className="p-6" aria-busy="true" aria-label="Memuat">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200/90 dark:bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-slate-200/90 dark:bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-slate-200/90 dark:bg-muted" />
      </div>
    </div>
  );
}
