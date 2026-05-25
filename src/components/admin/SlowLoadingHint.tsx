import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/admin/FadeIn';

/** Muat terlalu lama tanpa error — bukan state gagal (hindari kotak merah) */
export function SlowLoadingHint({
  title = 'Memuat lebih lama dari biasanya',
  description = 'Koneksi atau server sedang lambat. Anda bisa menunggu atau memuat ulang.',
  onRetry,
  className = '',
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <FadeIn className={className}>
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/50 dark:bg-amber-950/30"
        role="status"
        aria-live="polite"
      >
        <Clock className="mx-auto mb-2 h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Muat ulang
        </Button>
      </div>
    </FadeIn>
  );
}
