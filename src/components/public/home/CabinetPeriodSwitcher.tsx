import { useId } from 'react';
import { cn } from '@/lib/utils/utils';

export type CabinetPeriodOption = {
  id: string;
  name: string;
  period: string;
  is_active?: boolean;
};

type CabinetPeriodSwitcherProps = {
  cabinets: CabinetPeriodOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  className?: string;
  /** Tabs when few cabinets; select when many (default 5). */
  selectWhenAbove?: number;
};

/**
 * Periode kabinet: tab underline (≤N) atau <select> agar 10+ periode tidak memanjang.
 * Always sets an explicit id (no toggle-off) so previous cabinets stay clickable.
 */
export function CabinetPeriodSwitcher({
  cabinets,
  selectedId,
  onSelect,
  className,
  selectWhenAbove = 5,
}: CabinetPeriodSwitcherProps) {
  const selectId = useId();
  if (cabinets.length <= 1) return null;

  const activeId =
    selectedId && cabinets.some((c) => c.id === selectedId)
      ? selectedId
      : cabinets.find((c) => c.is_active)?.id || cabinets[0]?.id || '';

  if (cabinets.length > selectWhenAbove) {
    return (
      <div className={cn('flex justify-center', className)}>
        <label htmlFor={selectId} className="sr-only">
          Pilih periode kabinet
        </label>
        <select
          id={selectId}
          value={activeId}
          onChange={(e) => onSelect(e.target.value)}
          className="min-h-10 max-w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/40"
        >
          {cabinets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.period}
              {c.is_active ? ' (aktif)' : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Pilih periode kabinet"
      className={cn(
        'flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 overflow-x-auto scrollbar-hide',
        className,
      )}
    >
      {cabinets.map((c) => {
        const selected = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`Periode kabinet ${c.name} ${c.period}${selected ? ' — sedang dipilih' : ''}`}
            onClick={() => onSelect(c.id)}
            className={cn(
              'relative inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/40',
              selected ? 'text-[var(--public-primary)]' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <span className="relative inline-flex items-center gap-1.5 pb-[3px]">
              <span>{c.name}</span>
              <span className="text-xs font-medium opacity-70">{c.period}</span>
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 h-[1px] origin-left bg-[var(--public-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  selected ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
