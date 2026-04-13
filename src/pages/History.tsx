import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Calendar, CheckCircle2, Clock, XCircle, MapPin, Smartphone, Camera, History as HistoryIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AttendanceHistory {
  id: string;
  session_title: string;
  class_name: string | null;
  session_date: string;
  check_in_time: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'SICK' | 'EXCUSED';
  ip: string;
  device: string;
  photo_url?: string;
}

export default function AttendanceHistory() {
  const [history, setHistory] = useState<AttendanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/reports'); // Uses the same endpoint but filtered for USER in backend
        setHistory(res.data.data);
      } catch (error) {
        console.error('Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(h => {
    if (filter === 'ALL') return true;
    if (filter === 'EXCUSED') return h.status === 'SICK' || h.status === 'EXCUSED';
    return h.status === filter;
  });

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <HistoryIcon className="w-8 h-8" />
            Riwayat Kehadiran
          </h1>
          <p className="text-indigo-100 text-lg">
            Pantau semua catatan absensimu sepanjang semester di sini.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', 'PRESENT', 'LATE', 'EXCUSED', 'ABSENT'].map((statusOption) => (
          <Button
            key={statusOption}
            variant={filter === statusOption ? 'default' : 'outline'}
            onClick={() => setFilter(statusOption)}
            className={`rounded-full ${filter === statusOption ? 'shadow-md shadow-indigo-500/30' : ''}`}
          >
            {statusOption === 'ALL' ? 'Semua Riwayat' : 
             statusOption === 'PRESENT' ? 'Hadir Tepat Waktu' : 
             statusOption === 'LATE' ? 'Terlambat' : 
             statusOption === 'EXCUSED' ? 'Sakit / Izin' : 'Alfa'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 dark:text-zinc-400">
          Memuat riwayat kehadiran...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-12 text-center flex flex-col items-center">
          <Calendar size={48} className="text-slate-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Belum Ada Riwayat</h3>
          <p className="text-slate-500 dark:text-zinc-400">
            {filter === 'ALL' ? 'Kamu belum mengikuti sesi kelas apapun.' : 'Tidak ada data untuk status ini.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
                <TableRow>
                  <TableHead>Kelas / Sesi</TableHead>
                  <TableHead>Jadwal (Waktu Check-in)</TableHead>
                  <TableHead>Perangkat & IP</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-bold text-slate-900 dark:text-white text-base">{item.session_title}</div>
                      {item.class_name && (
                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{item.class_name}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 text-slate-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-indigo-500" />
                          <span className="font-medium">{format(new Date(item.session_date), 'dd MMM yyyy', { locale: id })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
                          <Clock size={14} />
                          {format(new Date(item.check_in_time), 'HH:mm:ss')} WIB
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Smartphone size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]" title={item.device}>{item.device || 'Perangkat tidak diketahui'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="font-mono">{item.ip || 'N/A'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.photo_url ? (
                        <a href={item.photo_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1.5 text-sm font-medium">
                          <Camera size={14} /> Lihat Foto
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-600 text-sm italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={item.status === 'PRESENT' ? 'success' : item.status === 'LATE' ? 'warning' : item.status === 'SICK' || item.status === 'EXCUSED' ? 'secondary' : 'destructive'}
                        className="gap-1.5 px-3 py-1"
                      >
                        {item.status === 'PRESENT' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {item.status === 'LATE' && <Clock className="w-3.5 h-3.5" />}
                        {(item.status === 'SICK' || item.status === 'EXCUSED') && <FileText className="w-3.5 h-3.5" />}
                        {item.status === 'ABSENT' && <XCircle className="w-3.5 h-3.5" />}
                        {item.status === 'SICK' ? 'SAKIT' : item.status === 'EXCUSED' ? 'IZIN' : item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}