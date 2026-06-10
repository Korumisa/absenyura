import PublicLayout from '@/components/PublicLayout';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';

/** Error state standar halaman publik */
export function PublicPageError({
  title = 'Gagal memuat halaman',
  error,
  onRetry,
  message = 'Layanan sedang mengalami gangguan sementara. Silakan coba lagi dalam beberapa saat.',
}: {
  title?: string;
  error: unknown;
  onRetry: () => void;
  message?: string;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
        <ErrorWithRetry title={title} error={error} onRetry={onRetry} message={message} />
      </div>
    </PublicLayout>
  );
}
