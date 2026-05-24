import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Bar aksi bawah kartu admin (Simpan / Reset) — terpisah dari konten utama */
export function AdminCardActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-4 sm:flex-row sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}
