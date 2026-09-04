import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

type LastSavedIndicatorProps = {
  lastSavedAt: Date | null | undefined;
  isDirty: boolean;
  isSaving: boolean;
  className?: string;
};

export function LastSavedIndicator({
  lastSavedAt,
  isDirty,
  isSaving,
  className,
}: LastSavedIndicatorProps) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (isSaving) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
          className
        )}
        aria-live="polite"
      >
        <span
          className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-amber-500"
          aria-hidden="true"
        />
        Menyimpan...
      </Badge>
    );
  }

  if (isDirty) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
          className
        )}
      >
        <AlertCircle className="mr-1.5 size-3.5" aria-hidden="true" />
        Perubahan belum disimpan
      </Badge>
    );
  }

  if (!lastSavedAt) {
    return null;
  }

  const label = formatDistanceToNow(lastSavedAt, {
    addSuffix: true,
    locale: idLocale,
  });

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
        className
      )}
      aria-live="polite"
    >
      <CheckCircle2 className="mr-1.5 size-3.5" aria-hidden="true" />
      Tersimpan {label}
    </Badge>
  );
}
