import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ATTENDANCE_CHART_COLORS } from '@/lib/attendanceChartTheme';

export type DashboardChartPoint = {
  date: string;
  present?: number;
  late?: number;
  sick?: number;
  excused?: number;
  absent?: number;
};

type DashboardAttendanceBarChartProps = {
  chartData: DashboardChartPoint[];
  chartFilter: string;
  chartStacked: boolean;
  chartBarSize: number;
  chartPointCount: number;
};

export default function DashboardAttendanceBarChart({
  chartData,
  chartFilter,
  chartStacked,
  chartBarSize,
  chartPointCount,
}: DashboardAttendanceBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
        barCategoryGap={chartStacked ? '18%' : '24%'}
        barGap={chartStacked ? 2 : 4}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: id })}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
          interval={chartPointCount > 20 ? Math.floor(chartPointCount / 10) : 0}
          dy={10}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
          width={36}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          }}
          labelFormatter={(val) =>
            val ? format(new Date(val as string), 'dd MMMM yyyy', { locale: id }) : ''
          }
          labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
        />
        {(chartFilter === 'ALL' || chartFilter === 'PRESENT') && (
          <Bar
            dataKey="present"
            name="Hadir"
            fill={ATTENDANCE_CHART_COLORS.present}
            stackId={chartStacked ? 'kehadiran' : undefined}
            barSize={chartBarSize}
            minPointSize={4}
            radius={chartStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
        )}
        {(chartFilter === 'ALL' || chartFilter === 'LATE') && (
          <Bar
            dataKey="late"
            name="Terlambat"
            fill={ATTENDANCE_CHART_COLORS.late}
            stackId={chartStacked ? 'kehadiran' : undefined}
            barSize={chartBarSize}
            minPointSize={4}
            radius={chartStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
        )}
        {(chartFilter === 'ALL' || chartFilter === 'SICK_EXCUSED') && (
          <Bar
            dataKey="sick"
            name="Sakit"
            fill={ATTENDANCE_CHART_COLORS.sick}
            stackId={chartStacked ? 'kehadiran' : undefined}
            barSize={chartBarSize}
            minPointSize={4}
            radius={chartStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
        )}
        {(chartFilter === 'ALL' || chartFilter === 'SICK_EXCUSED') && (
          <Bar
            dataKey="excused"
            name="Izin"
            fill={ATTENDANCE_CHART_COLORS.excused}
            stackId={chartStacked ? 'kehadiran' : undefined}
            barSize={chartBarSize}
            minPointSize={4}
            radius={chartStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
        )}
        {(chartFilter === 'ALL' || chartFilter === 'ABSENT') && (
          <Bar
            dataKey="absent"
            name="Alfa"
            fill={ATTENDANCE_CHART_COLORS.absent}
            stackId={chartStacked ? 'kehadiran' : undefined}
            barSize={chartBarSize}
            minPointSize={4}
            radius={chartStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
