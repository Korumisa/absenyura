import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Users, Calendar, CheckCircle2, Clock, MapPin, FileText, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#4f46e5', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [chartFilter, setChartFilter] = useState('ALL');

  const [dateRange, setDateRange] = useState('30');

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const { data, error, isLoading: loading } = useSWR(user?.id ? `/dashboard?range=${dateRange}` : null, fetcher, { revalidateOnFocus: false });

  if (loading || !data) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        
        {/* Banner Skeleton */}
        <Skeleton className="h-48 w-full rounded-3xl" />
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>

        {/* Charts & Lists Skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const isUser = user?.role === 'USER';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-1">
          Selamat datang kembali, <span className="font-medium text-indigo-600 dark:text-indigo-400">{user?.name}</span>!
        </p>
      </div>

      {isUser ? (
        // ================= USER DASHBOARD (Modern & Clean) =================
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">Halo, {user?.name}! 👋</h2>
              <p className="text-indigo-100 text-lg max-w-xl">
                Ini adalah ringkasan kehadiranmu. Pertahankan terus persentase kehadiranmu untuk hasil yang maksimal di akhir semester.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mb-1">Total Sesi</p>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.total}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mb-1">Hadir Tepat Waktu</p>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.present}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mb-1">Total Izin / Sakit</p>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
                {(data?.stats.sick || 0) + (data?.stats.excused || 0)}
              </h3>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 size={24} />
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mb-1">Rasio Kehadiran</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.percentage}%</p>
                <span className={`text-xs font-bold mb-1.5 ${data?.stats.percentage >= 80 ? 'text-green-500' : 'text-red-500'}`}>
                  {data?.stats.percentage >= 80 ? 'Aman' : 'Bahaya'}
                </span>
              </div>
            </div>
          </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Jadwal Sesi Terdekat</h2>
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 py-1 px-3 rounded-full text-xs font-bold">
                  {data?.recent_sessions?.length || 0} Sesi
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
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
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
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
                            <div className="font-bold text-slate-900 dark:text-white text-base">{session.title}</div>
                            {session.class && (
                              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{session.class.name}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 text-slate-700 dark:text-zinc-300">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-500" />
                                <span className="font-medium">{format(new Date(session.session_start), 'dd MMM yyyy', { locale: id })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
                                <Clock size={14} />
                                {format(new Date(session.session_start), 'HH:mm')} - {format(new Date(session.session_end), 'HH:mm')} WIB
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                              <MapPin size={14} className="text-emerald-500 shrink-0" />
                              <span className="font-medium text-sm line-clamp-1">{session.location?.name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.status === 'ACTIVE' ? (
                                <div className="flex gap-2 justify-end">
                                  {session.attendances && session.attendances.length > 0 ? (
                                    session.attendances[0].check_out_time || (!session.require_checkout) ? (
                                      <Badge variant="success" className="px-3 py-1 bg-green-100 text-green-700">Sudah Absen</Badge>
                                    ) : (
                                      <Button 
                                        onClick={() => window.location.href = `/attend?session=${session.id}&checkout=true`}
                                        className="shadow-lg shadow-amber-600/20 bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 h-auto"
                                      >
                                        Checkout
                                      </Button>
                                    )
                                  ) : (
                                    <Button 
                                      onClick={() => window.location.href = `/attend?session=${session.id}`}
                                      className="shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 h-auto"
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
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">Selamat Datang, {user?.name}! 🚀</h2>
              <p className="text-indigo-200 text-lg max-w-2xl">
                Pantau aktivitas akademik, kelola jadwal sesi, dan tinjau metrik kehadiran secara real-time dari satu dasbor pusat.
              </p>
            </div>
          </div>

          {/* Stats Grid Admin */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Total Pengguna</h3>
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Users size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.total_users}</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 font-medium">Mahasiswa terdaftar</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Total Sesi</h3>
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.total_sessions}</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 font-medium">Sesi kelas dibuat</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Hadir Hari Ini</h3>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.today_present}</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 font-medium">Peserta tepat waktu</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Terlambat Hari Ini</h3>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock size={24} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{data?.stats.today_late}</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 font-medium">Peserta terlambat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="xl:col-span-2 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tren Kehadiran</h2>
                <div className="flex items-center gap-3">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-zinc-800">
                      <SelectValue placeholder="Rentang Waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Hari Terakhir</SelectItem>
                      <SelectItem value="30">30 Hari Terakhir</SelectItem>
                      <SelectItem value="90">3 Bulan Terakhir</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={chartFilter} onValueChange={setChartFilter}>
                    <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-zinc-800">
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
              
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.chart_data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: id })}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(val) => format(new Date(val as string), 'dd MMMM yyyy', { locale: id })}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                    />
                    {(chartFilter === 'ALL' || chartFilter === 'PRESENT') && (
                      <Line 
                        type="monotone" 
                        dataKey="present" 
                        name="Hadir" 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} 
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }}
                        animationDuration={1500}
                      />
                    )}
                    {(chartFilter === 'ALL' || chartFilter === 'LATE') && (
                      <Line 
                        type="monotone" 
                        dataKey="late" 
                        name="Terlambat" 
                        stroke="#f59e0b" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f59e0b' }} 
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#f59e0b' }}
                        animationDuration={1500}
                      />
                    )}
                    {(chartFilter === 'ALL' || chartFilter === 'SICK_EXCUSED') && (
                      <Line 
                        type="monotone" 
                        dataKey="sick" 
                        name="Sakit/Izin" 
                        stroke="#64748b" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#64748b' }} 
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#64748b' }}
                        animationDuration={1500}
                      />
                    )}
                    {(chartFilter === 'ALL' || chartFilter === 'ABSENT') && (
                      <Line 
                        type="monotone" 
                        dataKey="absent" 
                        name="Alfa" 
                        stroke="#ef4444" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#ef4444' }} 
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#ef4444' }}
                        animationDuration={1500}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sessions List Admin */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Aktivitas Sesi Terbaru</h2>
              </div>
              
              <div className="flex-1 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
                    <TableRow>
                      <TableHead>Sesi & Kelas</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="text-right">Peserta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.recent_sessions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                          <div className="flex flex-col items-center">
                            <Calendar size={40} className="mb-3 opacity-50" />
                            <p className="text-sm font-medium">Belum ada sesi kelas yang dibuat.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.recent_sessions?.map((session: any) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-base">{session.title}</h4>
                                {session.class && (
                                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{session.class.name}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 
                                ${session.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 
                                  session.status === 'UPCOMING' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 
                                  'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                              >
                                {session.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-indigo-400" /> 
                                {format(new Date(session.session_start), 'dd MMM yyyy')}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-indigo-400" />
                                {format(new Date(session.session_start), 'HH:mm')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-slate-700 dark:text-zinc-300 font-medium">
                              <Users size={14} className="text-indigo-400" />
                              {session._count?.attendances || 0}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

