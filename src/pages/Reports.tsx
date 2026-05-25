import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import useSWR from 'swr';
import { Download, FileText, Search, CheckCircle2, Clock, XCircle, Edit3, ChevronDown, Loader2, Smartphone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { reportClassLabel } from '@/lib/reportLabel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Report } from '@/types/report';
import type { PaginationMeta } from '@/types/common';
import AdminPageShell from '@/components/AdminPageShell';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { CardSkeletonList } from '@/components/admin/CardSkeleton';
import { formatClassLabel } from '@/lib/classLabel';
import { TablePagination } from '@/components/ui/TablePagination';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { attendanceBadgeVariant, attendanceStatusLabel } from '@/lib/statusLabel';
import { toastErrorMessage } from '@/lib/toastMessage';
import { ConfirmModal } from '@/components/ConfirmModal';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const safeFormat = (value: unknown, fmt: string) => {
  const d = new Date(value as any);
  if (!isValid(d)) return '-';
  return format(d, fmt, { locale: id });
};

type ExportSessionMeta = {
  sessionId: string;
  sessionTitle: string;
  classesLabel: string;
};

async function buildSessionAttendUrl(sessionId: string): Promise<string> {
  try {
    const res = await api.get(`/sessions/${sessionId}/qr`);
    const token = res.data?.data?.token;
    if (token) {
      return `${window.location.origin}/attend?session=${sessionId}&token=${encodeURIComponent(token)}`;
    }
  } catch {
    /* fallback tanpa token */
  }
  return `${window.location.origin}/attend?session=${sessionId}`;
}

async function qrImageBase64(url: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 1, color: { dark: '#1e3a8a' } });
  return dataUrl.split(',')[1] ?? '';
}

export default function Reports() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sessionId, setSessionId] = useState('ALL');
  const [exporting, setExporting] = useState<'none' | 'excel' | 'pdf'>('none');
  
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '50'
  });
  if (sessionId && sessionId !== 'ALL') {
    queryParams.append('sessionId', sessionId);
  }
  if (startDate && endDate) {
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
  }

  const swr = useSWR(`/reports?${queryParams.toString()}`, fetcher, { revalidateOnFocus: false });
  const { isInitialLoading: loading, isError, retry } = useSwrPageState(swr);
  const { data, mutate } = swr;

  const reports: Report[] = Array.isArray(data?.data) ? (data.data.filter(Boolean) as Report[]) : [];
  const meta: PaginationMeta | null = data?.meta || null;

  const sessionsFetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const { data: sessions = [] } = useSWR<
    { id: string; title: string; session_start: string; class?: { name: string; semester: number } | null; session_classes?: { class: { name: string; semester: number } }[] }[]
  >('/sessions', sessionsFetcher, { revalidateOnFocus: false });

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, sessionId]);

  const filteredReports = useMemo(() => {
    const q = String(searchTerm ?? '').toLowerCase();
    return reports
      .filter((r): r is Report => Boolean(r && (r as any).id))
      .filter((r) => {
        const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const userName = String((r as any).user_name ?? '');
        const sessionTitle = String((r as any).session_title ?? '');
        const nim = String((r as any).nim_nip ?? '');
        const matchSearch =
          userName.toLowerCase().includes(q) ||
          sessionTitle.toLowerCase().includes(q) ||
          nim.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      });
  }, [reports, statusFilter, searchTerm]);

  const hasFilters =
    Boolean(searchTerm.trim()) ||
    statusFilter !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    sessionId !== 'ALL';

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [isOverrideConfirmOpen, setIsOverrideConfirmOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const exportExcelMatrix = useCallback(async (rows: Report[], fileSuffix: string, sessionMeta?: ExportSessionMeta) => {
    const safeRows = (Array.isArray(rows) ? rows : []).filter((r): r is Report => Boolean(r && (r as any).id));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rekap Matriks Kehadiran');

    // Dapatkan daftar sesi unik dari laporan yang difilter
    const uniqueSessions = Array.from(new Set(safeRows.map(r => String((r as any).session_title ?? '')))).filter(Boolean);
    
    // Siapkan kolom: Nama, NIM, Kelas, lalu diikuti nama-nama sesi
    const columns = [
      { header: 'Nama Peserta', key: 'user_name', width: 25 },
      { header: 'NIM/NIP', key: 'nim_nip', width: 15 },
      { header: 'Kelas', key: 'kelas', width: 22 },
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
    
    safeRows.forEach((r) => {
      const studentId = r.user_id;
      if (!studentId) return;
      if (!studentData[studentId]) {
        studentData[studentId] = {
          user_name: String((r as any).user_name ?? '-'),
          nim_nip: r.nim_nip || '-',
          kelas: reportClassLabel(r),
          total_present: 0,
          total_sick: 0,
          total_excused: 0,
          total_absent: 0
        };
      }
      
      // Isi status sesi
      const sessionTitle = String((r as any).session_title ?? '-');
      studentData[studentId][sessionTitle] = r.status;
      
      // Hitung total
      if (r.status === 'PRESENT' || r.status === 'LATE') (studentData[studentId].total_present as number) += 1;
      else if (r.status === 'SICK') (studentData[studentId].total_sick as number) += 1;
      else if (r.status === 'EXCUSED') (studentData[studentId].total_excused as number) += 1;
      else if (r.status === 'ABSENT') (studentData[studentId].total_absent as number) += 1;
    });

    Object.values(studentData).forEach(data => {
      sheet.addRow(data);
    });

    if (sessionMeta?.sessionId) {
      const qrSheet = workbook.addWorksheet('QR Scan Absensi');
      const attendUrl = await buildSessionAttendUrl(sessionMeta.sessionId);
      qrSheet.mergeCells('A1', 'D1');
      qrSheet.getCell('A1').value = `QR Absensi — ${sessionMeta.sessionTitle}`;
      qrSheet.getCell('A1').font = { bold: true, size: 14 };
      qrSheet.getCell('A2').value = `Kelas: ${sessionMeta.classesLabel}`;
      qrSheet.getCell('A3').value = 'Tautan scan (buka di browser HP):';
      qrSheet.getCell('A4').value = attendUrl;
      qrSheet.getCell('A4').font = { color: { argb: 'FF2563EB' }, underline: true };
      try {
        const base64 = await qrImageBase64(attendUrl);
        const imageId = workbook.addImage({ base64, extension: 'png' });
        qrSheet.addImage(imageId, { tl: { col: 0, row: 5 }, ext: { width: 220, height: 220 } });
      } catch {
        qrSheet.getCell('A6').value = '(QR gagal dibuat — gunakan tautan di atas)';
      }
      qrSheet.getColumn(1).width = 72;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Matriks_Kehadiran_${fileSuffix}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Matriks Laporan Excel berhasil diunduh');
  }, []);

  const exportPdfList = useCallback(async (rows: Report[], fileSuffix: string, sessionMeta?: ExportSessionMeta) => {
    const safeRows = (Array.isArray(rows) ? rows : []).filter((r): r is Report => Boolean(r && (r as any).id));
    const doc = new jsPDF();

    let tableStartY = 35;

    doc.setFontSize(16);
    doc.text('Laporan Rekapitulasi Kehadiran', 14, 20);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, 14, 28);

    if (sessionMeta?.sessionId) {
      const attendUrl = await buildSessionAttendUrl(sessionMeta.sessionId);
      doc.setFontSize(11);
      doc.text(`Sesi: ${sessionMeta.sessionTitle}`, 14, 36);
      doc.text(`Kelas: ${sessionMeta.classesLabel}`, 14, 42);
      try {
        const base64 = await qrImageBase64(attendUrl);
        doc.addImage(`data:image/png;base64,${base64}`, 'PNG', 150, 14, 48, 48);
      } catch {
        /* tanpa gambar QR */
      }
      doc.setFontSize(8);
      doc.text('QR / tautan scan absensi:', 14, 50);
      doc.text(doc.splitTextToSize(attendUrl, 130), 14, 55);
      tableStartY = 68;
    }

    const tableData = safeRows.map(r => [
      String((r as any).user_name ?? '-'),
      r.nim_nip || '-',
      reportClassLabel(r),
      String((r as any).session_title ?? '-'),
      safeFormat((r as any).session_date, 'dd/MM/yyyy'),
      safeFormat((r as any).check_in_time, 'HH:mm:ss'),
      (r as any).status ?? '-'
    ]);

    autoTable(doc, {
      head: [['Nama', 'NIM/NIP', 'Kelas', 'Sesi', 'Tanggal', 'Waktu', 'Status']],
      body: tableData,
      startY: tableStartY,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Rekap_Kehadiran_${fileSuffix}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success('Laporan PDF berhasil diunduh');
  }, []);

  const fetchAllReportsForSession = useCallback(async (sid: string) => {
    const limit = 500;
    let p = 1;
    const all: Report[] = [];
    while (true) {
      const params = new URLSearchParams({ page: String(p), limit: String(limit), sessionId: sid });
      const res = await api.get(`/reports?${params.toString()}`);
      const chunk: Report[] = res.data?.data || [];
      const m: PaginationMeta | undefined = res.data?.meta;
      all.push(...chunk);
      if (!m || p >= m.totalPages) break;
      p += 1;
    }
    return all;
  }, []);

  const sessionExportMeta = useCallback((): ExportSessionMeta | undefined => {
    if (sessionId === 'ALL') return undefined;
    const s = sessions.find((x) => x.id === sessionId);
    if (!s) return undefined;
    const labels = (s.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
    const classesLabel = labels.length ? labels.join(', ') : s.class ? formatClassLabel(s.class) : 'Umum';
    return { sessionId, sessionTitle: s.title, classesLabel };
  }, [sessionId, sessions]);

  const handleExportExcel = useCallback(async () => {
    const sanitize = (s: string) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'Sesi';
    try {
      setExporting('excel');
      const meta = sessionExportMeta();
      if (sessionId !== 'ALL') {
        const all = await fetchAllReportsForSession(sessionId);
        const rows = all.filter((r) => statusFilter === 'ALL' || r.status === statusFilter);
        const title = sessions.find((s) => s.id === sessionId)?.title || 'Sesi';
        await exportExcelMatrix(rows, sanitize(title), meta);
        return;
      }
      await exportExcelMatrix(filteredReports, 'Semua');
    } catch (err: unknown) {
      toast.error(toastErrorMessage(err, 'Gagal export Excel'));
    } finally {
      setExporting('none');
    }
  }, [exportExcelMatrix, fetchAllReportsForSession, filteredReports, sessionExportMeta, sessionId, sessions, statusFilter]);

  const handleExportPDF = useCallback(async () => {
    const sanitize = (s: string) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'Sesi';
    try {
      setExporting('pdf');
      const meta = sessionExportMeta();
      if (sessionId !== 'ALL') {
        const all = await fetchAllReportsForSession(sessionId);
        const rows = all.filter((r) => statusFilter === 'ALL' || r.status === statusFilter);
        const title = sessions.find((s) => s.id === sessionId)?.title || 'Sesi';
        await exportPdfList(rows, sanitize(title), meta);
        return;
      }
      await exportPdfList(filteredReports, 'Semua');
    } catch (err: unknown) {
      toast.error(toastErrorMessage(err, 'Gagal export PDF'));
    } finally {
      setExporting('none');
    }
  }, [exportPdfList, fetchAllReportsForSession, filteredReports, sessionExportMeta, sessionId, sessions, statusFilter]);

  const handleOpenOverride = (report: Report) => {
    setSelectedReport(report);
    setOverrideStatus(report.status);
    setOverrideNotes('');
    setIsOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || overrideSubmitting) return;

    setOverrideSubmitting(true);
    try {
      await api.post('/attendance/override', {
        session_id: selectedReport.session_id,
        user_id: selectedReport.user_id,
        status: overrideStatus,
        notes: overrideNotes
      });
      
      toast.success('Status kehadiran berhasil diubah');
      setIsOverrideConfirmOpen(false);
      setIsOverrideModalOpen(false);
      
      // Refresh reports
      mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Gagal mengubah status'));
    } finally {
      setOverrideSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      title="Rekap Kehadiran"
      description="Filter data lalu export ke Excel atau PDF."
      variant="plain"
      icon={<FileText className="h-5 w-5" />}
      actions={
        <div className="flex gap-2">
          <Button
            onClick={handleExportExcel}
            disabled={exporting !== 'none'}
            className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700"
            aria-busy={exporting === 'excel'}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {exporting === 'excel' ? 'Menyiapkan Excel…' : 'Export Excel'}
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={exporting !== 'none'}
            variant="destructive"
            className="min-h-11"
            aria-busy={exporting === 'pdf'}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            {exporting === 'pdf' ? 'Menyiapkan PDF…' : 'Export PDF'}
          </Button>
        </div>
      }
    >
      {isError ? (
        <ErrorWithRetry title="Gagal memuat rekap" error={swr.error} onRetry={retry} />
      ) : (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
        <div className="shrink-0 border-b border-border p-5">
          <button
            type="button"
            className="mb-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground md:hidden"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filter &amp; pencarian
            <ChevronDown className={`h-5 w-5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-end ${filtersOpen ? 'flex' : 'hidden md:flex'}`}>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Cari nama, NIM, atau sesi..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              aria-describedby="reports-search-hint"
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-[150px]"
            />
            <span className="flex h-10 shrink-0 items-center px-0.5 text-muted-foreground" aria-hidden="true">
              –
            </span>
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
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="Semua Sesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Sesi</SelectItem>
              {sessions.map((s) => {
                const labels = (s.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
                const classesLabel = labels.length ? labels.join(', ') : s.class ? formatClassLabel(s.class) : 'Umum';
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} ({classesLabel}) - {safeFormat(s.session_start, 'dd MMM')}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <p id="reports-search-hint" className="mt-3 text-xs text-muted-foreground">
          Pencarian memfilter data di halaman ini ({filteredReports.length} baris).
        </p>
        </div>

        <ul className="space-y-4 md:hidden" aria-label="Daftar laporan kehadiran">
          {loading ? (
            <li>
              <CardSkeletonList count={4} />
            </li>
          ) : filteredReports.length === 0 ? (
            <li>
              <AdminEmptyState compact icon={FileText} hasFilters={hasFilters} />
            </li>
          ) : (
            filteredReports.map((report: Report, idx) => (
              <li key={report.id ?? idx} className="space-y-3 rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground">{report.user_name}</p>
                    <p className="text-sm text-muted-foreground">{report.nim_nip}</p>
                  </div>
                  <Badge variant={attendanceBadgeVariant(report.status)} className="shrink-0 gap-1">
                    {report.status === 'PRESENT' && <CheckCircle2 className="h-3 w-3" />}
                    {report.status === 'LATE' && <Clock className="h-3 w-3" />}
                    {(report.status === 'SICK' || report.status === 'EXCUSED') && <FileText className="h-3 w-3" />}
                    {report.status === 'ABSENT' && <XCircle className="h-3 w-3" />}
                    {attendanceStatusLabel(report.status)}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-muted-foreground">Kelas: {reportClassLabel(report)}</p>
                <p className="text-sm font-medium text-brand">{report.session_title}</p>
                <p className="text-xs text-muted-foreground">
                  {safeFormat(report.session_date, 'dd MMM yyyy')} · {safeFormat(report.check_in_time, 'HH:mm:ss')}
                </p>
                <div className="flex items-start gap-3">
                  {report.photo_url ? (
                    <a href={report.photo_url} target="_blank" rel="noreferrer" className="shrink-0 hover:opacity-80">
                      <img
                        src={report.photo_url}
                        alt="Bukti hadir"
                        className="h-12 w-12 rounded-md border border-border object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="shrink-0" aria-hidden="true" />
                      <span className="font-mono">IP: {report.ip || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Smartphone size={12} className="shrink-0" aria-hidden="true" />
                      <span className="truncate" title={report.device || undefined}>{report.device || '—'}</span>
                    </div>
                  </div>
                </div>
                {user?.role !== 'USER' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 w-full"
                    onClick={() => report?.id && handleOpenOverride(report)}
                  >
                    <Edit3 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Override status
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <Table className="min-w-[800px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
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
                  <TableCell colSpan={user?.role !== 'USER' ? 7 : 6} className="p-0">
                    <AdminEmptyState compact icon={FileText} hasFilters={hasFilters} className="border-0 shadow-none" />
                  </TableCell>
                </TableRow>
              ) : (
                (filteredReports ?? [])
                  .filter((r): r is Report => Boolean(r && (r as any).id))
                  .map((report: any, idx: number) => (
                  <TableRow key={String(report?.id ?? idx)}>
                    <TableCell>
                      <div className="font-medium text-foreground">{String(report?.user_name ?? '-')}</div>
                      <div className="text-sm text-muted-foreground">{String(report?.nim_nip ?? '-') || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-zinc-200">{String(report?.session_title ?? '-')}</div>
                      {report?.class_name && <div className="text-xs font-semibold text-brand text-brand mt-0.5">{typeof report.class_name === 'object' && report.class_name !== null ? ((report.class_name as any).name || (report.class_name as any).id) : report.class_name}</div>}
                      <div className="text-xs text-muted-foreground mt-1">
                        {safeFormat(report.session_date, 'dd MMMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-zinc-300 font-medium">
                      {safeFormat(report.check_in_time, 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={attendanceBadgeVariant(report.status)} className="gap-1">
                        {report.status === 'PRESENT' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {report.status === 'LATE' && <Clock className="w-3 h-3 mr-1" />}
                        {(report.status === 'SICK' || report.status === 'EXCUSED') && <FileText className="w-3 h-3 mr-1" />}
                        {report.status === 'ABSENT' && <XCircle className="w-3 h-3 mr-1" />}
                        {attendanceStatusLabel(report.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.photo_url ? (
                        <a href={report.photo_url} target="_blank" rel="noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                          <img src={report.photo_url} alt="Bukti Hadir" className="w-10 h-10 object-cover rounded-md shadow-sm border border-border" />
                        </a>
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center text-xs text-slate-400 text-muted-foreground">
                          -
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground font-mono mb-1">
                        IP: {report.ip || '-'}
                      </div>
                      <div className="text-xs text-slate-400 text-muted-foreground max-w-[150px] truncate" title={report.device || '-'}>
                        {report.device || '-'}
                      </div>
                    </TableCell>
                    {user?.role !== 'USER' && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => report?.id && handleOpenOverride(report)}
                          className="text-muted-foreground hover:text-brand hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/30"
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
        
        {meta ? (
          <TablePagination meta={meta} onPageChange={setPage} itemLabel="laporan" />
        ) : null}
      </div>
      )}

      {/* Override Modal */}
      <Dialog open={Boolean(isOverrideModalOpen && selectedReport)} onOpenChange={setIsOverrideModalOpen}>
        <DialogContent className="max-w-md p-0">
          <div className="border-b border-border px-6 py-4 border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Ubah Status Manual</DialogTitle>
              <DialogDescription className="sr-only">Override status kehadiran</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleOverrideSubmit} className="p-6">
                {selectedReport && (
                  <div className="mb-4 ...">
                    <p><strong>Nama:</strong> {selectedReport.user_name}</p>
                    <p><strong>Sesi:</strong> {selectedReport.session_title}</p>
                    <p><strong>Waktu:</strong> {safeFormat(selectedReport.check_in_time, 'dd MMM yyyy HH:mm:ss')}</p>
                  </div>
                )}

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
              
              <DialogFooter className="mt-8">
                <Button type="button" variant="outline" onClick={() => setIsOverrideModalOpen(false)} disabled={overrideSubmitting}>
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={overrideSubmitting}
                  onClick={() => setIsOverrideConfirmOpen(true)}
                >
                  {overrideSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Menyimpan…
                    </>
                  ) : (
                    'Simpan Status'
                  )}
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={isOverrideConfirmOpen}
        onClose={() => setIsOverrideConfirmOpen(false)}
        onConfirm={() => {
          void handleOverrideSubmit({ preventDefault: () => {} } as React.FormEvent);
        }}
        title="Ubah status kehadiran?"
        description={
          selectedReport
            ? `Status ${selectedReport.user_name} pada sesi "${selectedReport.session_title}" akan diubah menjadi ${attendanceStatusLabel(overrideStatus)}.`
            : 'Status kehadiran akan diubah secara manual.'
        }
        confirmText="Ya, Ubah Status"
        variant="warning"
      />
    </AdminPageShell>
  );
}
