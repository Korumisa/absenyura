import { cn } from '@/lib/utils';

/** Petunjuk scroll tabel di layar kecil — temuan #18 */
export function MobileTableHint({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'px-4 py-2 text-center text-xs text-muted-foreground md:hidden',
        className,
      )}
      role="note"
    >
      Geser tabel ke kiri/kanan untuk melihat semua kolom.
    </p>
  );
}
