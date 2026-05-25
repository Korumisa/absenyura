import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, Download, UploadCloud, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Excuse } from '@/types/excuse';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatClassLabel } from '@/lib/classLabel';
import AdminPageShell from '@/components/AdminPageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { excuseStatusLabel } from '@/lib/statusLabel';
import { toastErrorMessage } from '@/lib/toastMessage';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { TablePagination } from '@/components/ui/TablePagination';
import { FileText as FileTextIcon } from 'lucide-react';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function Excuses() {
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<
    { id: string; title: string; session_start: string; class?: { name: string; semester: number } | null; session_classes?: { class: { name: string; semester: number } }[] }[]
  >([]);
  
  const [formData, setFormData] = useState({
    session_id: '',
    reason: 'SICK',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewConfirm, setReviewConfirm] = useState<{
    id: string;
    status: 'APPROVED' | 'REJECTED';
    studentName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.type.startsWith('image/');
    if (!ok) {
      toast.error('File harus berupa gambar atau PDF');
      return;
    }
    setFile(f);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const clearFile = () => {
    setFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const swr = useSWR<Excuse[]>('/excuses', fetcher, { revalidateOnFocus: false });
  const { data: excuses = [], isInitialLoading: loading, isError, retry, mutate } = useSwrPageState(swr);
  const hasFilters = Boolean(searchTerm.trim()) || statusFilter !== 'ALL' || reasonFilter !== 'ALL';

  const resolveProofUrl = (proofUrl: string | null | undefined) => {
    if (!proofUrl) return null;
    if (proofUrl.startsWith('http') || proofUrl.startsWith('data:')) return proofUrl;
    return `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '')}${proofUrl}`;
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      // Filter sessions that are active or upcoming
      setSessions(res.data.data.filter((s: any) => s.status !== 'CLOSED'));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'USER') {
      fetchSessions();
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.session_id) {
      toast.error('Pilih sesi kelas terlebih dahulu');
      return;
    }
    if (!file) {
      toast.error('Unggah bukti dokumen/foto terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('session_id', formData.session_id);
      form.append('reason', formData.reason);
      form.append('description', formData.description);
      form.append('proof', file);

      await api.post('/excuses', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Pengajuan izin berhasil dikirim');
      setIsModalOpen(false);
      setFormData({ session_id: '', reason: 'SICK', description: '' });
      clearFile();
      mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Terjadi kesalahan saat mengajukan izin'));
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewConfirm = (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    studentName: string,
  ) => {
    setReviewConfirm({ id, status, studentName });
  };

  const confirmReview = async () => {
    if (!reviewConfirm || reviewingId) return;
    const { id, status } = reviewConfirm;
    setReviewingId(id);
    try {
      await api.put(`/excuses/${id}/review`, { status });
      toast.success(`Pengajuan izin ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      mutate();
      setReviewConfirm(null);
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Gagal mereview pengajuan izin'));
    } finally {
      setReviewingId(null);
    }
  };

  const actionOverlayLabel = submitting
    ? 'Mengirim pengajuan izin…'
    : reviewingId
      ? 'Memproses tinjauan…'
      : null;

  const filteredExcuses = excuses.filter(ex => {
    const matchSearch = (ex.user?.name && ex.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.session?.title && ex.session.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    if (statusFilter !== 'ALL' && ex.status !== statusFilter) return false;
    if (reasonFilter !== 'ALL' && ex.reason !== reasonFilter) return false;

    return true;
  });

  const {
    paginatedItems: paginatedExcuses,
    meta: excusesPaginationMeta,
    setPage: setExcusesPage,
  } = useClientPagination(filteredExcuses, {
    pageSize: 20,
    resetDeps: [searchTerm, statusFilter, reasonFilter],
  });

  const exportCsv = () => {
    const escapeCsv = (value: unknown) => {
      const raw = String(value ?? '');
      const normalized = raw.replace(/\r?\n/g, ' ').trim();
      if (/[",]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
      return normalized;
    };

    const rows = filteredExcuses.map((ex) => {
      const proof =
        ex.proof_url && (ex.proof_url.startsWith('http') || ex.proof_url.startsWith('data:'))
          ? ex.proof_url
          : ex.proof_url
            ? `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '')}${ex.proof_url}`
            : '';
      return [
        ex.id,
        ex.user?.name ?? '',
        ex.user?.nim_nip ?? '',
        ex.session?.title ?? '',
        (() => {
          const labels = (ex.session as any)?.session_classes?.map((x: any) => formatClassLabel(x?.class)).filter(Boolean) ?? [];
          if (labels.length) return labels.join(', ');
          return ex.session?.class ? formatClassLabel(ex.session.class) : '';
        })(),
        ex.reason ?? '',
        ex.status ?? '',
        ex.description ?? '',
        ex.reviewer?.name ?? '',
        ex.created_at ?? '',
        ex.session?.session_start ?? '',
        proof,
      ].map(escapeCsv).join(',');
    });

    const header = [
      'id',
      'nama',
      'nim',
      'sesi',
      'kelas',
      'alasan',
      'status',
      'keterangan',
      'reviewer',
      'dibuat_pada',
      'jadwal_sesi',
      'bukti_url',
    ].join(',');

    const content = `\uFEFF${header}\n${rows.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pengajuan-izin-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Unduh CSV berhasil');
  };

  return (
    <>
    <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
    <AdminPageShell
      title="Pengajuan Izin & Sakit"
      description={currentUser?.role === 'USER' ? 'Ajukan izin atau sakit untuk sesi yang Anda lewatkan.' : 'Tinjau dan setujui pengajuan mahasiswa.'}
      variant="plain"
      icon={<FileText className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap gap-2">
          {currentUser?.role !== 'USER' ? (
            <Button variant="outline" className="min-h-11" onClick={exportCsv} disabled={loading || filteredExcuses.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Unduh CSV
            </Button>
          ) : null}
          {currentUser?.role === 'USER' ? (
            <Button className="min-h-11" onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Pengajuan baru
            </Button>
          ) : null}
        </div>
      }
    >
      {isError ? (
        <ErrorWithRetry
          title="Gagal memuat pengajuan izin"
          error={swr.error}
          onRetry={retry}
        />
      ) : (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
        <div className="flex flex-col gap-5 border-b border-border p-5 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari nama mahasiswa atau kelas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="PENDING">Menunggu</SelectItem>
              <SelectItem value="APPROVED">Disetujui</SelectItem>
              <SelectItem value="REJECTED">Ditolak</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semua Alasan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Alasan</SelectItem>
              <SelectItem value="SICK">Sakit</SelectItem>
              <SelectItem value="EXCUSED">Izin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ul className="space-y-4 md:hidden" aria-label="Daftar pengajuan izin">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="rounded-2xl border border-border p-4 border-border">
                  <Skeleton className="mb-2 h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-3 h-9 w-full" />
                </li>
              ))
            : filteredExcuses.length === 0 ? (
                <li>
                  <AdminEmptyState
                    compact
                    icon={FileTextIcon}
                    title={hasFilters ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
                    description={
                      hasFilters
                        ? 'Ubah filter atau kata kunci pencarian.'
                        : 'Pengajuan izin dan sakit akan muncul di sini.'
                    }
                  />
                </li>
              )
            : paginatedExcuses.map((excuse) => {
                const proofHref = resolveProofUrl(excuse.proof_url);
                const classLabel = (() => {
                  const labels = (excuse.session.session_classes ?? [])
                    .map((x) => formatClassLabel(x?.class))
                    .filter(Boolean);
                  if (labels.length) return labels.join(', ');
                  return excuse.session.class ? formatClassLabel(excuse.session.class) : 'Umum';
                })();
                return (
                <li key={excuse.id} className="rounded-2xl border border-border p-4 border-border">
                  {currentUser?.role !== 'USER' && (
                    <>
                      <p className="font-bold text-foreground">{excuse.user.name}</p>
                      <p className="text-xs text-muted-foreground">{excuse.user.nim_nip || '-'}</p>
                    </>
                  )}
                  <p className="mt-1 text-sm font-medium text-brand">{excuse.session.title}</p>
                  <p className="text-xs font-semibold text-brand">{classLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(excuse.session.session_start), 'dd MMM yyyy HH:mm', { locale: id })}
                  </p>
                  {excuse.description ? (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2" title={excuse.description}>
                      {excuse.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant={excuse.reason === 'SICK' ? 'destructive' : 'warning'}>
                      {excuse.reason === 'SICK' ? 'Sakit' : 'Izin'}
                    </Badge>
                    <Badge
                      variant={
                        excuse.status === 'APPROVED' ? 'success' : excuse.status === 'REJECTED' ? 'destructive' : 'secondary'
                      }
                    >
                      {excuseStatusLabel(excuse.status)}
                    </Badge>
                  </div>
                  {excuse.reviewer ? (
                    <p className="mt-2 text-[10px] text-muted-foreground">Oleh: {excuse.reviewer.name}</p>
                  ) : null}
                  {proofHref ? (
                    <a
                      href={proofHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-brand text-brand"
                    >
                      <Download className="h-4 w-4" />
                      Lihat bukti
                    </a>
                  ) : null}
                  {currentUser?.role !== 'USER' && excuse.status === 'PENDING' ? (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 flex-1 border-emerald-200 text-emerald-700"
                        disabled={!!reviewingId}
                        aria-busy={reviewingId === excuse.id}
                        onClick={() => openReviewConfirm(excuse.id, 'APPROVED', excuse.user?.name ?? 'Mahasiswa')}
                      >
                        {reviewingId === excuse.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Terima'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 flex-1 border-red-200 text-red-700"
                        disabled={!!reviewingId}
                        onClick={() => openReviewConfirm(excuse.id, 'REJECTED', excuse.user?.name ?? 'Mahasiswa')}
                      >
                        Tolak
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
              })}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
              <TableRow>
                {currentUser?.role !== 'USER' && <TableHead>Mahasiswa</TableHead>}
                <TableHead>Kelas / Sesi</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead>Status</TableHead>
                {currentUser?.role !== 'USER' && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Memuat data...</TableCell>
                </TableRow>
              ) : filteredExcuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={currentUser?.role !== 'USER' ? 6 : 5} className="p-0">
                    <AdminEmptyState
                      compact
                      icon={FileTextIcon}
                      title={hasFilters ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
                      description={
                        hasFilters
                          ? 'Ubah filter atau kata kunci pencarian.'
                          : 'Pengajuan izin dan sakit akan muncul di sini.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExcuses.map((excuse) => (
                  <TableRow key={excuse.id}>
                    {currentUser?.role !== 'USER' && (
                      <TableCell>
                        <div className="font-medium text-foreground">{excuse.user.name}</div>
                        <div className="text-xs text-muted-foreground">{excuse.user.nim_nip}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-zinc-200">{excuse.session.title}</div>
                      <div className="text-xs font-semibold text-brand text-brand mt-0.5">
                        {(() => {
                          const labels = (excuse.session.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
                          if (labels.length) return labels.join(', ');
                          return excuse.session.class ? formatClassLabel(excuse.session.class) : 'Umum';
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(excuse.session.session_start), 'dd MMM yyyy HH:mm', { locale: id })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={excuse.reason === 'SICK' ? 'destructive' : 'warning'}>
                        {excuse.reason === 'SICK' ? 'Sakit' : 'Izin'}
                      </Badge>
                      <p className="text-xs mt-1 max-w-xs truncate text-muted-foreground" title={excuse.description}>
                        {excuse.description || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      {excuse.proof_url ? (
                        <a href={excuse.proof_url?.startsWith('http') || excuse.proof_url?.startsWith('data:') ? excuse.proof_url : `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '')}${excuse.proof_url}`} target="_blank" rel="noreferrer" className="text-brand hover:underline flex items-center gap-1 text-sm">
                          <FileText size={14} /> Lihat Bukti
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={excuse.status === 'APPROVED' ? 'success' : excuse.status === 'REJECTED' ? 'destructive' : 'default'} className="gap-1">
                        {excuse.status === 'APPROVED' && <CheckCircle2 size={12} />}
                        {excuse.status === 'REJECTED' && <XCircle size={12} />}
                        {excuse.status === 'PENDING' && <Clock size={12} />}
                        {excuseStatusLabel(excuse.status)}
                      </Badge>
                      {excuse.reviewer && (
                        <div className="text-[10px] text-slate-400 mt-1">Oleh: {excuse.reviewer.name}</div>
                      )}
                    </TableCell>
                    {currentUser?.role !== 'USER' && (
                      <TableCell className="text-right">
                        {excuse.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              disabled={!!reviewingId}
                              aria-busy={reviewingId === excuse.id}
                              onClick={() => openReviewConfirm(excuse.id, 'APPROVED', excuse.user?.name ?? 'Mahasiswa')}
                            >
                              {reviewingId === excuse.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Terima'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              disabled={!!reviewingId}
                              onClick={() => openReviewConfirm(excuse.id, 'REJECTED', excuse.user?.name ?? 'Mahasiswa')}
                            >
                              Tolak
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          meta={excusesPaginationMeta}
          onPageChange={setExcusesPage}
          itemLabel="pengajuan"
        />
      </div>
      )}

      {/* Modal Form */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open && submitting) return;
          setIsModalOpen(open);
        }}
      >
        <DialogContent className="max-w-lg p-0">
          <div className="border-b border-border px-6 py-5 border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Buat Pengajuan Izin Baru</DialogTitle>
              <DialogDescription className="sr-only">Form pengajuan izin</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              <div className="space-y-2">
                <Label>Pilih Sesi / Kelas <span className="text-red-500">*</span></Label>
                <Select required value={formData.session_id} onValueChange={val => setFormData({...formData, session_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Sesi yang akan diizinkan" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}{' '}
                        ({(() => {
                          const labels = (s.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
                          if (labels.length) return labels.join(', ');
                          return s.class ? formatClassLabel(s.class) : 'Umum';
                        })()}){' '}
                        - {format(new Date(s.session_start), 'dd MMM', { locale: id })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Jenis Izin <span className="text-red-500">*</span></Label>
                <Select required value={formData.reason} onValueChange={val => setFormData({...formData, reason: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SICK">Sakit</SelectItem>
                    <SelectItem value="EXCUSED">Izin (Kegiatan/Lainnya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Keterangan <span className="text-red-500">*</span></Label>
                <Input 
                  type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Mohon sebutkan alasan izin/sakit..."
                />
              </div>

              <div className="space-y-2">
                <Label>Bukti Dokumen/Foto (Surat Dokter/Kegiatan) <span className="text-red-500">*</span></Label>
                <Input
                  ref={fileInputRef as any}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    acceptFile(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition-colors',
                    'border-border hover:bg-slate-50 border-border dark:hover:bg-zinc-900/40',
                    isDragging && 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20',
                    file && 'py-4',
                  )}
                >
                  {!file ? (
                    <>
                      <UploadCloud className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                        Drag & drop file di sini, atau klik untuk upload
                      </div>
                      <div className="text-xs text-muted-foreground">Gambar atau PDF</div>
                    </>
                  ) : (
                    <div className="flex w-full flex-col gap-3">
                      {filePreviewUrl ? (
                        <img src={filePreviewUrl} alt="Pratinjau bukti" className="mx-auto max-h-40 rounded-lg object-contain" />
                      ) : file.type === 'application/pdf' ? (
                        <p className="text-sm text-muted-foreground">Pratinjau PDF: buka setelah upload untuk memastikan isi dokumen benar.</p>
                      ) : null}
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-200">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearFile();
                        }}
                        aria-label="Hapus file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="mt-4 gap-4 sm:gap-3">
                <Button type="button" variant="outline" className="min-h-11" disabled={submitting} onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="min-h-11" disabled={submitting} aria-busy={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Mengirim…
                    </>
                  ) : (
                    'Kirim Pengajuan'
                  )}
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={Boolean(reviewConfirm)}
        onClose={() => setReviewConfirm(null)}
        onConfirm={() => void confirmReview()}
        title={
          reviewConfirm?.status === 'APPROVED'
            ? 'Setujui pengajuan izin?'
            : 'Tolak pengajuan izin?'
        }
        description={
          reviewConfirm
            ? `Pengajuan dari ${reviewConfirm.studentName} akan ${
                reviewConfirm.status === 'APPROVED' ? 'disetujui' : 'ditolak'
              } dan status kehadiran disesuaikan.`
            : ''
        }
        confirmText={reviewConfirm?.status === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak'}
        variant={reviewConfirm?.status === 'REJECTED' ? 'danger' : 'primary'}
      />
    </AdminPageShell>
    </>
  );
}
