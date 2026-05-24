import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errorMessage';

/** [A11y] P1 — error state dengan retry untuk halaman berbasis SWR */
export function ErrorWithRetry({
  title = 'Gagal memuat data',
  error,
  onRetry,
  className = '',
}: {
  title?: string;
  error: unknown;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30 ${className}`}
      role="alert"
    >
      <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
        {getErrorMessage(error, 'Periksa koneksi internet Anda lalu coba muat ulang.')}
      </p>
      <Button type="button" className="mt-6 min-h-11" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Muat ulang
      </Button>
    </div>
  );
}
