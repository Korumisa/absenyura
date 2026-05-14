import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, Download, UploadCloud, X } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.type.startsWith('image/');
    if (!ok) {
      toast.error('File harus berupa gambar atau PDF');
      return;
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const { data: excuses = [], error, isLoading: loading, mutate } = useSWR<Excuse[]>('/excuses', fetcher, { revalidateOnFocus: false });

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
    if (!formData.session_id) {
      toast.error('Pilih sesi kelas terlebih dahulu');
      return;
    }
    if (!file) {
      toast.error('Unggah bukti dokumen/foto terlebih dahulu');
      return;
    }
    
    try {
      const form = new FormData();
      form.append('session_id', formData.session_id);
      form.append('reason', formData.reason);
      form.append('description', formData.description);
      form.append('proof', file);

      await api.post('/excuses', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Pengajuan izin berhasil dikirim');
      setIsModalOpen(false);
      setFormData({ session_id: '', reason: 'SICK', description: '' });
      clearFile();
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan saat mengajukan izin');
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/excuses/${id}/review`, { status });
      toast.success(`Pengajuan izin ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      mutate();
    } catch (error) {
      toast.error('Gagal mereview pengajuan izin');
    }
  };

  const filteredExcuses = excuses.filter(ex => {
    const matchSearch = (ex.user?.name && ex.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.session?.title && ex.session.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    if (statusFilter !== 'ALL' && ex.status !== statusFilter) return false;
    if (reasonFilter !== 'ALL' && ex.reason !== reasonFilter) return false;

    return true;
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
    toast.success('Export CSV berhasil');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pengajuan Izin & Sakit</h1>
        <div className="flex flex-wrap items-center gap-3">
          {currentUser?.role !== 'USER' ? (
            <Button variant="outline" onClick={exportCsv} disabled={loading || filteredExcuses.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          ) : null}
          {currentUser?.role === 'USER' ? (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Pengajuan Baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
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
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">Memuat data...</TableCell>
                </TableRow>
              ) : filteredExcuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">Tidak ada data pengajuan izin.</TableCell>
                </TableRow>
              ) : (
                filteredExcuses.map((excuse) => (
                  <TableRow key={excuse.id}>
                    {currentUser?.role !== 'USER' && (
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">{excuse.user.name}</div>
                        <div className="text-xs text-slate-500">{excuse.user.nim_nip}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-zinc-200">{excuse.session.title}</div>
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {(() => {
                          const labels = (excuse.session.session_classes ?? []).map((x: any) => formatClassLabel(x?.class)).filter(Boolean);
                          if (labels.length) return labels.join(', ');
                          return excuse.session.class ? formatClassLabel(excuse.session.class) : 'Umum';
                        })()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {format(new Date(excuse.session.session_start), 'dd MMM yyyy HH:mm', { locale: id })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={excuse.reason === 'SICK' ? 'destructive' : 'warning'}>
                        {excuse.reason === 'SICK' ? 'Sakit' : 'Izin'}
                      </Badge>
                      <p className="text-xs mt-1 max-w-xs truncate text-slate-600 dark:text-zinc-400" title={excuse.description}>
                        {excuse.description || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      {excuse.proof_url ? (
                        <a href={excuse.proof_url?.startsWith('http') || excuse.proof_url?.startsWith('data:') ? excuse.proof_url : `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '')}${excuse.proof_url}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-sm">
                          <FileText size={14} /> Lihat Bukti
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={excuse.status === 'APPROVED' ? 'success' : excuse.status === 'REJECTED' ? 'destructive' : 'default'} className="gap-1">
                        {excuse.status === 'APPROVED' && <CheckCircle2 size={12} />}
                        {excuse.status === 'REJECTED' && <XCircle size={12} />}
                        {excuse.status === 'PENDING' && <Clock size={12} />}
                        {excuse.status}
                      </Badge>
                      {excuse.reviewer && (
                        <div className="text-[10px] text-slate-400 mt-1">Oleh: {excuse.reviewer.name}</div>
                      )}
                    </TableCell>
                    {currentUser?.role !== 'USER' && (
                      <TableCell className="text-right">
                        {excuse.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleReview(excuse.id, 'APPROVED')}>
                              Terima
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReview(excuse.id, 'REJECTED')}>
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
      </div>

      {/* Modal Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">Buat Pengajuan Izin Baru</DialogTitle>
              <DialogDescription className="sr-only">Form pengajuan izin</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
                    'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
                    'border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-900/40',
                    isDragging && 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20',
                    file && 'py-4',
                  )}
                >
                  {!file ? (
                    <>
                      <UploadCloud className="h-5 w-5 text-slate-500" />
                      <div className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                        Drag & drop file di sini, atau klik untuk upload
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">Gambar atau PDF</div>
                    </>
                  ) : (
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-200">{file.name}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
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
                  )}
                </div>
              </div>
              
              <DialogFooter className="mt-8 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Kirim Pengajuan
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
