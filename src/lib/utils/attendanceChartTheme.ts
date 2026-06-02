export type AttendanceChartKey = 'present' | 'late' | 'sick' | 'excused' | 'absent';

export const ATTENDANCE_CHART_COLORS: Record<AttendanceChartKey, string> = {
  present: '#4ade80',
  late: '#fbbf24',
  sick: '#94a3b8',
  excused: '#818cf8',
  absent: '#fb7185',
};

export type AttendanceLegendItem = {
  key: AttendanceChartKey;
  label: string;
  dotClass: string;
  pillClass: string;
};

export const ATTENDANCE_LEGEND_ITEMS: AttendanceLegendItem[] = [
  {
    key: 'present',
    label: 'Hadir',
    dotClass: 'bg-emerald-500',
    pillClass: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    key: 'late',
    label: 'Terlambat',
    dotClass: 'bg-amber-500',
    pillClass: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    key: 'sick',
    label: 'Sakit',
    dotClass: 'bg-slate-500',
    pillClass: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    key: 'excused',
    label: 'Izin',
    dotClass: 'bg-indigo-500',
    pillClass: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    key: 'absent',
    label: 'Alfa',
    dotClass: 'bg-rose-500',
    pillClass: 'bg-rose-50 dark:bg-rose-950/40',
  },
];

export type ChartFilterValue = 'ALL' | 'PRESENT' | 'LATE' | 'SICK_EXCUSED' | 'ABSENT';

export function legendKeysForFilter(filter: ChartFilterValue): AttendanceChartKey[] {
  if (filter === 'PRESENT') return ['present'];
  if (filter === 'LATE') return ['late'];
  if (filter === 'SICK_EXCUSED') return ['sick', 'excused'];
  if (filter === 'ABSENT') return ['absent'];
  return ['present', 'late', 'sick', 'excused', 'absent'];
}
