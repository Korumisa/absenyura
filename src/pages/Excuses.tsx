import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Excuse {
  id: string;
  user_id: string;
  session_id: string;
  reason: string;
  description: string;
  proof_url: string | null;
  status: string;
  created_at: string;
  user: { name: string, nim_nip: string };
  session: { title: string, session_start: string, class: { name: string } | null };
  reviewer: { name: string } | null;
}

export default function Excuses() {
  const { user: currentUser } = useAuthStore();
  const [excuses, setExcuses] = useState<Excuse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<{id: string, title: string, session_start: string, class: {name: string}}[]>([]);
  
  const [formData, setFormData] = useState({
    session_id: '',
    reason: 'SICK',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const fetchExcuses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/excuses');
      setExcuses(res.data.data);
    } catch (error) {
      toast.error('Gagal mengambil data pengajuan izin');
    } finally {
      setLoading(false);
    }
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
    fetchExcuses();
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
    
    try {
      const form = new FormData();
      form.append('session_id', formData.session_id);
      form.append('reason', formData.reason);
      form.append('description', formData.description);
      if (file) {
        form.append('proof', file);
      }

      await api.post('/excuses', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Pengajuan izin berhasil dikirim');
      setIsModalOpen(false);
      setFormData({ session_id: '', reason: 'SICK', description: '' });
      setFile(null);
      fetchExcuses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan saat mengajukan izin');
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/excuses/${id}/review`, { status });
      toast.success(`Pengajuan izin ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      fetchExcuses();
    } catch (error) {
      toast.error('Gagal mereview pengajuan izin');
    }
  };

  const filteredExcuses = excuses.filter(ex => 
    (ex.user?.name && ex.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ex.session?.title && ex.session.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pengajuan Izin & Sakit</h1>
        {currentUser?.role === 'USER' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Pengajuan Baru
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari nama mahasiswa atau kelas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
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
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{excuse.session.class?.name}</div>
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
                        <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${excuse.proof_url}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-sm">
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-lg flex flex-col border border-slate-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Buat Pengajuan Izin Baru</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Pilih Sesi / Kelas</Label>
                <Select value={formData.session_id} onValueChange={val => setFormData({...formData, session_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Sesi yang akan diizinkan" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} ({s.class ? s.class.name : 'Umum'}) - {format(new Date(s.session_start), 'dd MMM', { locale: id })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Jenis Izin</Label>
                <Select value={formData.reason} onValueChange={val => setFormData({...formData, reason: val})}>
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
                <Label>Keterangan (Opsional)</Label>
                <Input 
                  type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Sakit demam berdarah..."
                />
              </div>

              <div className="space-y-2">
                <Label>Bukti Dokumen/Foto (Opsional)</Label>
                <Input 
                  type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                  accept="image/*,.pdf"
                />
              </div>
              
              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Kirim Pengajuan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}