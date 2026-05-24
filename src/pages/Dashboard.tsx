import React, { useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Users, Calendar, CheckCircle2, Clock, MapPin, FileText, BarChart3, QrCode } from 'lucide-react';
import AdminPageShell from '@/components/AdminPageShell';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { MobileTableHint } from '@/components/ui/MobileTableHint';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { DashboardAdminSkeleton, DashboardUserSkeleton } from '@/components/admin/DashboardSkeleton';
import { Badge } from '@/components/ui/badge';
import { formatClassLabel } from '@/lib/classLabel';
import { sessionStatusLabel } from '@/lib/sessionStatusLabel';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#4f46e5', '#f59e0b', '#ef4444'];

type DashboardRecentSession = {
  id: string;
  title: unknown;
  status: string;
  session_start: string;
  class?: unknown;
  location?: { name?: string } | null;
  _count?: { attendances?: number };
};

function dashboardSessionTitle(session: DashboardRecentSession): string {
  if (typeof session.title === 'object' && session.title !== null) {
    const t = session.title as { name?: string; id?: string };
    return t.name || t.id || '—';
  }
  return String(session.title ?? '—');
}

function dashboardSessionClass(session: DashboardRecentSession): string | null {
  if (!session.class) return null;
  if (typeof session.class === 'object' && session.class !== null) {
    const c = session.class as { name?: string; id?: string };
    return formatClassLabel(session.class as Parameters<typeof formatClassLabel>[0]) || c.name || c.id || null;
  }
  return String(session.class);
}

function dashboardSessionStatusClass(status: string): string {
  if (status === 'ACTIVE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
  }
  if (status === 'UPCOMING') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
  return '';
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [chartFilter, setChartFilter] = useState('ALL');

  const [dateRange, setDateRange] = useState('30');

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const { data, error, isLoading: loading, isValidating, mutate } = useSWR(user?.id ? `/dashboard?range=${dateRange}` : null, fetcher, { revalidateOnFocus: false });

  const activeSession = useMemo(() => {
    const sessions = data?.recent_sessions ?? [];
    return sessions.find((s: { status?: string }) => s.status === 'ACTIVE') ?? null;
  }, [data?.recent_sessions]);

  const chartData = data?.chart_data ?? [];
  const chartPointCount = chartData.length;
  const chartStacked = chartFilter === 'ALL';
  const chartBarSize = useMemo(() => {
    if (chartPointCount > 60) return 10;
    if (chartPointCount > 30) return 14;
    return 22;
  }, [chartPointCount]);

  const isUser = user?.role === 'USER';

  return (
    <AdminPageShell
      title="Dashboard"
      description={
        <>
          Selamat datang kembali,{' '}
          <span className="font-medium text-brand text-brand">{user?.name}</span>!
        </>
      }
      icon={<BarChart3 className="h-5 w-5" />}
    >
      {loading && !data ? (
        isUser ? <DashboardUserSkeleton /> : <DashboardAdminSkeleton />
      ) : error && !data ? (
        <ErrorWithRetry title="Gagal memuat dashboard" error={error} onRetry={() => mutate()} />
      ) : !data ? null : isUser ? (
        // ================= USER DASHBOARD (Modern & Clean) =================
        <div className="space-y-8">
          {/* [UX] quick action — sesi aktif */}
          {activeSession ? (
            <section className="rounded-3xl border-2 border-indigo-500 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-xl sm:p-8" aria-label="Sesi absensi aktif">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">Sesi berlangsung sekarang</p>
              <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{activeSession.title}</h2>
              <p className="mt-2 text-indigo-100">
                {format(new Date(activeSession.session_start), 'EEEE, dd MMM · HH:mm', { locale: id })} WIB
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-6 min-h-12 w-full bg-white font-bold text-indigo-700 hover:bg-indigo-50 sm:w-auto"
                onClick={() => navigate(`/attend?session=${activeSession.id}`)}
              >
                <QrCode className="mr-2 h-5 w-5" aria-hidden="true" />
                Absen sekarang
              </Button>
            </section>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-xl sm:p-10">
              <div className="relative z-10">
                <h2 className="mb-2 text-3xl font-extrabold sm:text-4xl">Halo, {user?.name}!</h2>
                <p className="max-w-xl text-lg text-indigo-100">
                  Ringkasan kehadiranmu. Pertahankan persentase kehadiran untuk hasil maksimal di akhir semester.
                </p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-card text-card-foreground p-4 sm:p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-brand text-brand mb-4 group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Total Sesi</p>
              <p className="text-3xl font-extrabold text-foreground">{data?.stats.total}</p>
            </div>
            <div className="bg-card text-card-foreground p-4 sm:p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Hadir Tepat Waktu</p>
              <p className="text-3xl font-extrabold text-foreground">{data?.stats.present}</p>
            </div>
            <div className="bg-card text-card-foreground p-4 sm:p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Total Izin / Sakit</p>
              <h3 className="text-3xl font-extrabold text-foreground">
                {(data?.stats.sick || 0) + (data?.stats.excused || 0)}
              </h3>
            </div>

            <div className="bg-card text-card-foreground p-4 sm:p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 size={24} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Rasio Kehadiran</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-extrabold text-foreground">{data?.stats.percentage}%</p>
                <span className={`text-xs font-bold mb-1.5 ${data?.stats.percentage >= 80 ? 'text-green-500' : 'text-red-500'}`}>
                  {data?.stats.percentage >= 80 ? 'Aman' : 'Perlu perhatian'}
                </span>
              </div>
            </div>
          </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <h2 className="text-xl font-bold text-foreground">Jadwal Sesi Terdekat</h2>
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-brand text-brand py-1 px-3 rounded-full text-xs font-bold">
                  {data?.recent_sessions?.length || 0} Sesi
                </span>
              </div>
              
              {/* [UX] D-01 — kartu mobile jadwal sesi */}
              <ul className="space-y-4 md:hidden" aria-label="Jadwal sesi terdekat">
                {!data?.recent_sessions?.length ? (
                  <li className="py-8 text-center text-muted-foreground">Belum ada sesi terdekat.</li>
                ) : (
                  data.recent_sessions.map((session: any) => (
                    <li key={session.id} className="rounded-2xl border border-border p-4 border-border">
                      <p className="font-bold text-foreground">{session.title}</p>
                      <p className="text-sm text-brand text-brand">
                        {(() => {
                          const labels = (session.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
                          if (labels.length) return labels.join(', ');
                          return session.class ? formatClassLabel(session.class) : 'Semua Mahasiswa';
                        })()}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {format(new Date(session.session_start), 'dd MMM yyyy · HH:mm', { locale: id })} WIB
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {typeof session.location === 'object' ? session.location?.name : session.location || '-'}
                      </p>
                      <div className="mt-3">
                        {session.status === 'ACTIVE' ? (
                          session.attendances?.length > 0 ? (
                            session.attendances[0].check_out_time || !session.require_checkout ? (
                              <Badge variant="success">Sudah absen</Badge>
                            ) : (
                              <Button
                                className="min-h-11 w-full bg-amber-500 hover:bg-amber-600"
                                onClick={() =>
                                  navigate(
                                    `/attend?session=${session.id}&checkout=true&attendance=${session.attendances[0].id}`,
                                  )
                                }
                              >
                                Check-out
                              </Button>
                            )
                          ) : (
                            <Button className="min-h-11 w-full" onClick={() => navigate(`/attend?session=${session.id}`)}>
                              Scan QR absen
                            </Button>
                          )
                        ) : (
                          <Badge variant="secondary">Belum mulai</Badge>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <MobileTableHint />
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[720px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                    <TableRow>
                      <TableHead>Kelas & Sesi</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.recent_sessions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center justify-center">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Hore! Tidak ada kelas dalam waktu dekat.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.recent_sessions?.map((session: any) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="font-bold text-foreground text-base">
                              {typeof session.title === 'object' && session.title !== null ? ((session.title as any).name || (session.title as any).id) : session.title}
                            </div>
                            <p className="text-sm font-semibold text-brand text-brand mt-0.5">
                              {(() => {
                                const labels = (session.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
                                if (labels.length) return labels.join(', ');
                                if (session.class) {
                                  if (typeof session.class === 'object' && session.class !== null) {
                                    return formatClassLabel(session.class as any) || ((session.class as any).name || (session.class as any).id || '-');
                                  }
                                  return String((session.class as any)?.name || session.class || '-');
                                }
                                return 'Semua Mahasiswa';
                              })()}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-500" />
                                <span className="font-medium">{format(new Date(session.session_start), 'dd MMM yyyy', { locale: id })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock size={14} />
                                {format(new Date(session.session_start), 'HH:mm')} - {format(new Date(session.session_end), 'HH:mm')} WIB
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                                <MapPin size={14} className="shrink-0" />
                                <span className="truncate max-w-[200px]">{typeof session.location === 'object' && session.location !== null ? ((session.location as any).name || (session.location as any).id) : (session.location?.name || session.location || '-')}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.status === 'ACTIVE' ? (
                                <div className="flex gap-2 justify-end">
                                  {session.attendances && session.attendances.length > 0 ? (
                                    session.attendances[0].check_out_time || (!session.require_checkout) ? (
                                      <Badge variant="success" className="px-3 py-1">Sudah Absen</Badge>
                                    ) : (
                                      <Button 
                                        onClick={() =>
                                          navigate(
                                            `/attend?session=${session.id}&checkout=true&attendance=${session.attendances[0].id}`,
                                          )
                                        }
                                        className="h-auto min-h-11 bg-amber-500 px-3 py-1.5 text-xs text-white shadow-lg shadow-amber-600/20 hover:bg-amber-600"
                                      >
                                        Check-out
                                      </Button>
                                    )
                                  ) : (
                                    <Button 
                                      onClick={() => navigate(`/attend?session=${session.id}`)}
                                      className="h-auto min-h-11 bg-brand px-3 py-1.5 text-xs text-white shadow-lg shadow-indigo-600/20 hover:bg-brand/90"
                                    >
                                      Scan QR Absen
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="secondary" className="px-3 py-1">Belum Mulai</Badge>
                              )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
        </div>
      ) : (
        // ================= ADMIN DASHBOARD (Modern & Clean) =================
        <div className="space-y-8">
          {/* Welcome Banner Admin */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-indigo-950 dark:to-zinc-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">Selamat Datang, {user?.name}!</h2>
              <p className="text-indigo-200 text-lg max-w-2xl">
                Pantau aktivitas akademik, kelola jadwal sesi, dan tinjau metrik kehadiran secara real-time dari satu dasbor pusat.
              </p>
            </div>
          </div>

          {/* Stats Grid Admin */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Pengguna</h3>
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-brand text-brand group-hover:scale-110 transition-transform">
                  <Users size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{data?.stats.total_users}</p>
              <p className="text-xs text-slate-400 text-muted-foreground mt-2 font-medium">Mahasiswa terdaftar</p>
            </div>
            
            <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Total Sesi</h3>
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{data?.stats.total_sessions}</p>
              <p className="text-xs text-slate-400 text-muted-foreground mt-2 font-medium">Sesi kelas dibuat</p>
            </div>

            <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Hadir Hari Ini</h3>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{data?.stats.today_present}</p>
              <p className="text-xs text-slate-400 text-muted-foreground mt-2 font-medium">Peserta tepat waktu</p>
            </div>

            <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Terlambat Hari Ini</h3>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{data?.stats.today_late}</p>
              <p className="text-xs text-slate-400 text-muted-foreground mt-2 font-medium">Peserta terlambat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="xl:col-span-2 bg-card text-card-foreground p-4 sm:p-6 lg:p-8 rounded-3xl border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <h2 className="text-xl font-bold text-foreground">Tren Kehadiran</h2>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-full bg-slate-50 bg-muted sm:w-[140px]">
                      <SelectValue placeholder="Rentang Waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Hari Terakhir</SelectItem>
                      <SelectItem value="30">30 Hari Terakhir</SelectItem>
                      <SelectItem value="90">3 Bulan Terakhir</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={chartFilter} onValueChange={setChartFilter}>
                    <SelectTrigger className="w-full bg-slate-50 bg-muted sm:w-[180px]">
                      <SelectValue placeholder="Pilih Filter Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Kehadiran</SelectItem>
                      <SelectItem value="PRESENT">Hanya Hadir</SelectItem>
                      <SelectItem value="LATE">Hanya Terlambat</SelectItem>
                      <SelectItem value="SICK_EXCUSED">Sakit & Izin</SelectItem>
                      <SelectItem value="ABSENT">Hanya Alfa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="relative min-h-[320px] w-full min-w-0" aria-busy={isValidating}>
                {isValidating ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/60">
                    <p className="text-sm font-medium text-muted-foreground dark:text-zinc-300">Memperbarui grafik…</p>
                  </div>
                ) : null}
                {chartData.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    Belum ada data grafik untuk rentang ini.
                  </div>
                ) : (
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
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(val) => val ? format(new Date(val as string), 'dd MMMM yyyy', { locale: id }) : ''}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                    />
                    <Legend verticalAlign="bottom" height={28} />
                    {(chartFilter === 'ALL' || chartFilter === 'PRESENT') && (
                      <Bar
                        dataKey="present"
                        name="Hadir"
                        fill="#16a34a"
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
                        fill="#f59e0b"
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
                        fill="#64748b"
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
                        fill="#6366f1"
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
                        fill="#ef4444"
                        stackId={chartStacked ? 'kehadiran' : undefined}
                        barSize={chartBarSize}
                        minPointSize={4}
                        radius={chartStacked ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Sessions List Admin — kartu vertikal, tanpa scroll horizontal */}
            <div className="rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
              <div className="border-b border-border px-6 py-5">
                <h2 className="text-xl font-bold text-foreground">Aktivitas Sesi Terbaru</h2>
              </div>

              <ul className="space-y-3 p-5" aria-label="Sesi terbaru">
                {data?.recent_sessions?.length === 0 ? (
                  <li className="flex flex-col items-center py-10 text-center text-muted-foreground">
                    <Calendar size={40} className="mb-3 opacity-50" aria-hidden="true" />
                    <p className="text-sm font-medium">Belum ada sesi kelas yang dibuat.</p>
                  </li>
                ) : (
                  data.recent_sessions.map((session: DashboardRecentSession) => (
                    <li
                      key={session.id}
                      className="rounded-2xl border border-border bg-background/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground">{dashboardSessionTitle(session)}</p>
                          {dashboardSessionClass(session) ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">{dashboardSessionClass(session)}</p>
                          ) : null}
                        </div>
                        <Badge
                          variant="outline"
                          className={dashboardSessionStatusClass(session.status)}
                        >
                          {sessionStatusLabel(session.status)}
                        </Badge>
                      </div>
                      {session.location?.name ? (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin size={14} className="shrink-0" aria-hidden="true" />
                          <span className="truncate">{session.location.name}</span>
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="shrink-0 text-brand" aria-hidden="true" />
                          {format(new Date(session.session_start), 'dd MMM yyyy', { locale: id })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="shrink-0 text-brand" aria-hidden="true" />
                          {format(new Date(session.session_start), 'HH:mm', { locale: id })} WIB
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <Users size={14} className="shrink-0 text-brand" aria-hidden="true" />
                          {session._count?.attendances ?? 0} hadir
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
