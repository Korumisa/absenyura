import * as React from 'react';
import { cn } from '@/lib/utils';
import { MobileTableHint } from '@/components/ui/MobileTableHint';

type AdminTableShellProps = {
  /** Bar filter / pencarian di atas tabel */
  filter?: React.ReactNode;
  /** Daftar kartu mobile (md:hidden) */
  mobile?: React.ReactNode;
  /** Konten tabel desktop — biasanya <Table>...</Table> */
  children: React.ReactNode;
  /** Footer paginasi */
  footer?: React.ReactNode;
  className?: string;
  /** Sembunyikan petunjuk scroll horizontal */
  hideScrollHint?: boolean;
  /** min-width untuk tabel lebar */
  tableMinWidth?: string;
};

/**
 * [SYSTEMIC] Shell standar daftar admin: kartu + filter + mobile + tabel + paginasi.
 * Before → After: bg-white/bg-muted campur → bg-card rounded-xl shadow-card
 */
export function AdminTableShell({
  filter,
  mobile,
  children,
  footer,
  className,
  hideScrollHint = false,
  tableMinWidth = '720px',
}: AdminTableShellProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10',
        className,
      )}
    >
      {filter ? (
        <div className="border-b border-border p-5 sm:p-6">{filter}</div>
      ) : null}

      {mobile ? <div className="space-y-4 p-5 sm:p-6 md:hidden">{mobile}</div> : null}

      {!hideScrollHint ? (
        <div className="hidden md:block">
          <MobileTableHint />
        </div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <div style={{ minWidth: tableMinWidth }} className="w-full min-w-0">
          {children}
        </div>
      </div>

      {footer}
    </div>
  );
}

/** Wrapper kartu daftar admin */
export const adminTableShellClass =
  'overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10';

/** Header tabel admin — sticky + bg konsisten */
export const adminTableHeaderClass =
  'sticky top-0 z-10 bg-muted/50 [&_tr]:border-b';

/** Area scroll tabel desktop */
export const adminTableScrollClass = 'hidden overflow-x-auto md:block';
