import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** [IA] R1 — daftar sebagai mode utama + CTA buat baru */
export function CmsListToolbar({
  onCreate,
  createLabel = 'Buat baru',
  count,
  countLabel = 'item',
}: {
  onCreate: () => void;
  createLabel?: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-zinc-800">
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        {count !== undefined ? (
          <>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">{count}</span> {countLabel}
          </>
        ) : (
          'Kelola data yang sudah tersimpan'
        )}
      </p>
      <Button type="button" className="min-h-11 gap-2" onClick={onCreate}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {createLabel}
      </Button>
    </div>
  );
}
