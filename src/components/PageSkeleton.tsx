import { Loader2 } from 'lucide-react';

export default function PageSkeleton() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />
      <div className="h-4 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-zinc-800" />
      <div className="h-3 w-32 animate-pulse rounded-md bg-slate-100 dark:bg-zinc-900" />
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden />
      <p className="text-sm text-slate-500 dark:text-zinc-400">Memuat halaman...</p>
    </div>
  );
}
