import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { FadeIn } from '@/components/admin/FadeIn';

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
    <FadeIn className={className}>
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30"
        role="alert"
      >
        <AlertCircle className="mx-auto mb-4 size-12 text-red-500" aria-hidden="true" />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {getErrorMessage(error, 'Periksa koneksi internet Anda lalu coba muat ulang.')}
        </p>
        <Button type="button" className="mt-6 min-h-11" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" aria-hidden="true" />
          Muat ulang
        </Button>
      </div>
    </FadeIn>
  );
}
