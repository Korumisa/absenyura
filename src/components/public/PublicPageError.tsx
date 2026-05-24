import PublicLayout from '@/components/PublicLayout';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';

/** Error state standar halaman publik */
export function PublicPageError({
  title = 'Gagal memuat halaman',
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
        <ErrorWithRetry title={title} error={error} onRetry={onRetry} />
      </div>
    </PublicLayout>
  );
}
