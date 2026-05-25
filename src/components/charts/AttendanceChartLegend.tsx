import {
  ATTENDANCE_LEGEND_ITEMS,
  legendKeysForFilter,
  type ChartFilterValue,
} from '@/lib/attendanceChartTheme';

type AttendanceChartLegendProps = {
  chartFilter: ChartFilterValue;
};

export function AttendanceChartLegend({ chartFilter }: AttendanceChartLegendProps) {
  const keys = new Set(legendKeysForFilter(chartFilter));
  const items = ATTENDANCE_LEGEND_ITEMS.filter((item) => keys.has(item.key));

  if (items.length === 0) return null;

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-2"
      role="list"
      aria-label="Legenda status kehadiran"
    >
      {items.map((item) => (
        <span
          key={item.key}
          role="listitem"
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-foreground',
            item.pillClass,
          ].join(' ')}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}
