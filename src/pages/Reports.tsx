import React, { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import useSWR from 'swr';
import { Download, FileText, Search, CheckCircle2, Clock, XCircle, Edit3, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Report {
  id: string;
  user_name: string;
  nim_nip: string;
  session_title: string;
  class_name: string | null;
  session_id: string;
  user_id: string;
  session_date: string;
  check_in_time: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'SICK' | 'EXCUSED';
  ip: string;
  device: string;
  photo_url: string | null;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function Reports() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '50'
  });
  if (startDate && endDate) {
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
  }

  const { data, error: _error, isLoading: loading, mutate } = useSWR(`/reports?${queryParams.toString()}`, fetcher, {
    revalidateOnFocus: false
  });

  const reports: Report[] = data?.data || [];
  const meta: PaginationMeta | null = data?.meta || null;

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch = r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.session_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.nim_nip && r.nim_nip.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [reports, statusFilter, searchTerm]);

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState('');

  const handleExportExcel = useCallback(async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rekap Matriks Kehadiran');

    // Dapatkan daftar sesi unik dari laporan yang difilter
    const uniqueSessions = Array.from(new Set(filteredReports.map(r => r.session_title)));
    
    // Siapkan kolom: Nama, NIM, lalu diikuti nama-nama sesi
    const columns = [
      { header: 'Nama Peserta', key: 'user_name', width: 25 },
      { header: 'NIM/NIP', key: 'nim_nip', width: 15 },
    ];
    uniqueSessions.forEach(session => {
      columns.push({ header: session, key: session, width: 15 });
    });
    // Tambahkan kolom rekap total
    columns.push({ header: 'Total Hadir', key: 'total_present', width: 15 });
    columns.push({ header: 'Total Sakit', key: 'total_sick', width: 15 });
    columns.push({ header: 'Total Izin', key: 'total_excused', width: 15 });
    columns.push({ header: 'Total Alfa', key: 'total_absent', width: 15 });

    sheet.columns = columns;

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    // Kelompokkan data per mahasiswa
    const studentData: Record<string, Record<string, string | number>> = {};
    
    filteredReports.forEach((r) => {
      const studentId = r.user_id;
      if (!studentData[studentId]) {
        studentData[studentId] = {
          user_name: r.user_name,
          nim_nip: r.nim_nip || '-',
          total_present: 0,
          total_sick: 0,
          total_excused: 0,
          total_absent: 0
        };
      }
      
      // Isi status sesi
      studentData[studentId][r.session_title] = r.status;
      
      // Hitung total
      if (r.status === 'PRESENT' || r.status === 'LATE') (studentData[studentId].total_present as number) += 1;
      else if (r.status === 'SICK') (studentData[studentId].total_sick as number) += 1;
      else if (r.status === 'EXCUSED') (studentData[studentId].total_excused as number) += 1;
      else if (r.status === 'ABSENT') (studentData[studentId].total_absent as number) += 1;
    });

    Object.values(studentData).forEach(data => {
      sheet.addRow(data);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Matriks_Kehadiran_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Matriks Laporan Excel berhasil diunduh');
  }, [filteredReports]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Laporan Rekapitulasi Kehadiran', 14, 20);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, 14, 28);

    const tableData = filteredReports.map(r => [
      r.user_name,
      r.nim_nip || '-',
      r.session_title,
      format(new Date(r.session_date), 'dd/MM/yyyy'),
      format(new Date(r.check_in_time), 'HH:mm:ss'),
      r.status
    ]);

    autoTable(doc, {
      head: [['Nama', 'NIM/NIP', 'Sesi', 'Tanggal', 'Waktu', 'Status']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Rekap_Kehadiran_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success('Laporan PDF berhasil diunduh');
  }, [filteredReports]);

  const handleOpenOverride = (report: Report) => {
    setSelectedReport(report);
    setOverrideStatus(report.status);
    setOverrideNotes('');
    setIsOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      await api.post('/attendance/override', {
        session_id: selectedReport.session_id,
        user_id: selectedReport.user_id,
        status: overrideStatus,
        notes: overrideNotes
      });
      
      toast.success('Status kehadiran berhasil diubah');
      setIsOverrideModalOpen(false);
      
      // Refresh reports
      mutate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Gagal mengubah status');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Rekap Kehadiran</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button 
            onClick={handleExportPDF}
            variant="destructive"
          >
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari nama, NIM, atau sesi..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-[150px]"
            />
            <span className="self-center text-slate-500">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-[150px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="PRESENT">Hadir</SelectItem>
              <SelectItem value="LATE">Terlambat</SelectItem>
              <SelectItem value="SICK">Sakit</SelectItem>
              <SelectItem value="EXCUSED">Izin</SelectItem>
              <SelectItem value="ABSENT">Tidak Hadir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-950">
              <TableRow>
                <TableHead>Peserta</TableHead>
                <TableHead>Sesi / Kelas</TableHead>
                <TableHead>Waktu Check-in</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Foto Bukti</TableHead>
                <TableHead>Info Device/IP</TableHead>
                {user?.role !== 'USER' && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40 mb-1" />
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {user?.role !== 'USER' && (
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-20 ml-auto rounded-md" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">Tidak ada data ditemukan.</TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{report.user_name}</div>
                      <div className="text-sm text-slate-500 dark:text-zinc-400">{report.nim_nip || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-zinc-200">{report.session_title}</div>
                      {report.class_name && <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{report.class_name}</div>}
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        {format(new Date(report.session_date), 'dd MMMM yyyy', { locale: id })}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300 font-medium">
                      {format(new Date(report.check_in_time), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.status === 'PRESENT' ? 'success' : report.status === 'LATE' ? 'warning' : report.status === 'SICK' || report.status === 'EXCUSED' ? 'secondary' : 'destructive'}>
                        {report.status === 'PRESENT' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {report.status === 'LATE' && <Clock className="w-3 h-3 mr-1" />}
                        {(report.status === 'SICK' || report.status === 'EXCUSED') && <FileText className="w-3 h-3 mr-1" />}
                        {report.status === 'ABSENT' && <XCircle className="w-3 h-3 mr-1" />}
                        {report.status === 'PRESENT' ? 'Hadir' : report.status === 'LATE' ? 'Terlambat' : report.status === 'SICK' ? 'Sakit' : report.status === 'EXCUSED' ? 'Izin' : report.status === 'ABSENT' ? 'Tidak Hadir' : report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.photo_url ? (
                        <a href={report.photo_url} target="_blank" rel="noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                          <img src={report.photo_url} alt="Bukti Hadir" className="w-10 h-10 object-cover rounded-md shadow-sm border border-slate-200 dark:border-zinc-700" />
                        </a>
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-md flex items-center justify-center text-xs text-slate-400 dark:text-zinc-500">
                          -
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono mb-1">
                        IP: {report.ip || '-'}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-zinc-500 max-w-[150px] truncate" title={report.device || '-'}>
                        {report.device || '-'}
                      </div>
                    </TableCell>
                    {user?.role !== 'USER' && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenOverride(report)}
                          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/30"
                          title="Override Status"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50">
            <span className="text-sm text-slate-500 dark:text-zinc-400">
              Menampilkan {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} laporan
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {isOverrideModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Ubah Status Manual</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOverrideModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleOverrideSubmit} className="p-6">
              <div className="mb-4 text-sm text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-slate-100 dark:border-zinc-800">
                <p><strong>Nama:</strong> {selectedReport.user_name}</p>
                <p><strong>Sesi:</strong> {selectedReport.session_title}</p>
                <p><strong>Waktu:</strong> {format(new Date(selectedReport.check_in_time), 'dd MMM yyyy HH:mm:ss', { locale: id })}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status Baru</Label>
                  <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">Hadir (PRESENT)</SelectItem>
                      <SelectItem value="LATE">Terlambat (LATE)</SelectItem>
                      <SelectItem value="SICK">Sakit (SICK)</SelectItem>
                      <SelectItem value="EXCUSED">Izin (EXCUSED)</SelectItem>
                      <SelectItem value="ABSENT">Alfa (ABSENT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Catatan / Alasan (Opsional)</Label>
                  <Textarea 
                    rows={3} 
                    value={overrideNotes} 
                    onChange={e => setOverrideNotes(e.target.value)}
                    placeholder="Contoh: Dispensasi alat rusak"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOverrideModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Simpan Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}