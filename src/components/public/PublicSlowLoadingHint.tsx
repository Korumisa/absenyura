import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Hint muat lambat untuk halaman publik — gaya editorial, bukan error merah */
export function PublicSlowLoadingHint({
  onRetry,
  className = '',
}: {
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={[
        'rounded-2xl border border-black/10 bg-white/80 p-6 text-center shadow-[0_18px_45px_-42px_rgba(15,23,42,0.25)]',
        className,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <Clock className="mx-auto mb-2 size-8 text-[var(--public-primary)]" aria-hidden />
      <p className="text-sm font-semibold text-slate-900">Memuat lebih lama dari biasanya</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Koneksi atau server sedang lambat. Anda bisa menunggu atau memuat ulang.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4 min-h-11 border-black/10"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 size-4" aria-hidden />
        Muat ulang
      </Button>
    </div>
  );
}
