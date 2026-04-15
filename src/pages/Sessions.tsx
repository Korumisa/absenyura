import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, QrCode, MapPin, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import type { Location, Session } from '@/types/session';

export default function Sessions() {
  const { user: currentUser } = useAuthStore();
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '', description: '', location_id: '', class_id: '', qr_mode: 'NONE', 
    session_start: '', session_end: '', 
    check_in_open_at: '', check_in_close_at: '', 
    late_threshold_minutes: 15, require_checkout: false, status: 'UPCOMING'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const { data: sessions = [], error, isLoading: loading, mutate } = useSWR<Session[]>('/sessions', fetcher, { revalidateOnFocus: false });

  const fetchLocations = async () => {
    try {
      const [locationsRes, classesRes] = await Promise.all([
        api.get('/locations'),
        api.get('/classes')
      ]);
      setLocations(locationsRes.data.data);
      setClasses(classesRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== 'USER') {
      fetchLocations();
    }
  }, [currentUser]);

  // Format UTC date string to local datetime-local string
  const formatForDateTimeLocal = (dateString: string) => {
    const d = new Date(dateString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleOpenModal = (session: any = null) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        title: session.title,
        description: session.description || '',
        class_id: session.class_id || 'ALL_STUDENTS',
        location_id: session.location_id,
        qr_mode: session.qr_mode,
        session_start: formatForDateTimeLocal(session.session_start),
        session_end: formatForDateTimeLocal(session.session_end),
        check_in_open_at: formatForDateTimeLocal(session.check_in_open_at),
        check_in_close_at: formatForDateTimeLocal(session.check_in_close_at),
        late_threshold_minutes: session.late_threshold_minutes,
        require_checkout: session.require_checkout,
        status: session.status
      });
    } else {
      setEditingSession(null);
      
      // Default to today + 1 hour
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const nowStr = now.toISOString().slice(0, 16);
      
      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const laterStr = later.toISOString().slice(0, 16);

      setFormData({
        title: '', description: '', location_id: locations.length > 0 ? locations[0].id : '', class_id: 'ALL_STUDENTS', qr_mode: 'NONE', 
        session_start: nowStr, session_end: laterStr, 
        check_in_open_at: nowStr, check_in_close_at: laterStr, 
        late_threshold_minutes: 15, require_checkout: false, status: 'UPCOMING'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        session_start: new Date(formData.session_start).toISOString(),
        session_end: new Date(formData.session_end).toISOString(),
        check_in_open_at: new Date(formData.check_in_open_at).toISOString(),
        check_in_close_at: new Date(formData.check_in_close_at).toISOString(),
        class_id: formData.class_id === 'ALL_STUDENTS' ? null : formData.class_id
      };
      
      if (editingSession) {
        await api.put(`/sessions/${editingSession.id}`, payload);
        toast.success('Sesi berhasil diperbarui');
      } else {
        await api.post('/sessions', payload);
        toast.success('Sesi berhasil dibuat');
      }
      setIsModalOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus sesi ini?')) {
      try {
        await api.delete(`/sessions/${id}`);
        toast.success('Sesi berhasil dihapus');
        mutate();
      } catch (error) {
        toast.error('Gagal menghapus sesi');
      }
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLocation = filterLocation === 'ALL' || s.location?.id === filterLocation;
    const classId = s.class_id ?? null;
    const matchClass = filterClass === 'ALL' || classId === filterClass || (!classId && filterClass === 'ALL_STUDENTS');
    
    let matchDate = true;
    if (filterDate) {
      const sDate = new Date(s.session_start).toISOString().split('T')[0];
      matchDate = sDate === filterDate;
    }

    return matchSearch && matchLocation && matchClass && matchDate;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Sesi Kehadiran</h1>
        {currentUser?.role !== 'USER' && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Sesi Baru
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden mb-6">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-200 dark:border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari kegiatan/mata kuliah..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="w-full">
            <Input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full block"
            />
          </div>
          <div className="w-full">
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Lokasi</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kelas</SelectItem>
                <SelectItem value="ALL_STUDENTS">Semua Mahasiswa (Umum)</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
            <TableRow>
              <TableHead>Informasi Kelas/Event</TableHead>
              <TableHead>Jadwal Sesi</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Mode QR & Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500 dark:text-zinc-400">
                  Tidak ada sesi yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900 dark:text-white text-base">{session.title}</div>
                    <div className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin size={14} className="text-indigo-500" />
                      {session.location?.name}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Dibuat oleh: {session.creator?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 mb-1">
                      <Clock size={14} className="text-indigo-500" />
                      <span className="font-medium">{format(new Date(session.session_start), 'dd MMM yyyy', { locale: id })}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      {format(new Date(session.session_start), 'HH:mm')} - {format(new Date(session.session_end), 'HH:mm')} WIB
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-700 dark:text-zinc-300">
                      {(session as any).class ? (session as any).class.name : 'Semua Mahasiswa'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                        <MapPin size={14} className="text-emerald-500 shrink-0" />
                        <span className="font-medium text-sm line-clamp-1">{session.location?.name || 'Lokasi tidak diketahui'}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <QrCode size={14} className="text-slate-400" /> 
                        <span className="font-medium">{session.qr_mode === 'NONE' ? 'Tanpa QR (Hanya GPS)' : session.qr_mode === 'DYNAMIC' ? 'QR Dinamis' : 'QR Statis'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        {session.status === 'ACTIVE' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 
                          ${session.status === 'ACTIVE' ? 'bg-green-500' : 
                            session.status === 'UPCOMING' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                        </span>
                      </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                        {session.status === 'ACTIVE' ? 'Aktif (Berjalan)' : 
                         session.status === 'UPCOMING' ? 'Akan Datang' : 'Selesai'}
                      </span>
                    </div>
                  </TableCell>
                  {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {session.qr_mode !== 'NONE' && session.status !== 'CLOSED' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => window.open(`/sessions/${session.id}/qr`, '_blank')}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                            title="Tampilkan Layar QR (Dosen)"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenModal(session)}
                          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/30"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(session.id)}
                          className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/30"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {currentUser?.role === 'USER' && (
                    <TableCell className="text-right">
                      {session.status === 'ACTIVE' && (
                        <div className="flex gap-2 justify-end">
                          {(session as any).attendances && (session as any).attendances.length > 0 ? (
                            (session as any).attendances[0].check_out_time || (!session.require_checkout) ? (
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
                              className="shadow-sm"
                            >
                              Hadir
                            </Button>
                          )}
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

      {/* Modal Form (Admin Only) */}
      {isModalOpen && currentUser?.role !== 'USER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-8">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-full border border-slate-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingSession ? 'Edit Sesi Kehadiran' : 'Buat Sesi Baru'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Judul / Mata Kuliah <span className="text-red-500">*</span></Label>
                    <Input 
                      type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Pemrograman Web Lanjut (A)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi</Label>
                    <Textarea 
                      rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pilih Kelas <span className="text-red-500">*</span></Label>
                    <Select required value={formData.class_id} onValueChange={val => setFormData({...formData, class_id: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua Mahasiswa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_STUDENTS">Semua Mahasiswa</SelectItem>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lokasi Ruangan <span className="text-red-500">*</span></Label>
                    <Select required value={formData.location_id} onValueChange={(value) => setFormData({...formData, location_id: value})}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Lokasi Geofencing..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Metode Validasi QR <span className="text-red-500">*</span></Label>
                    <Select required value={formData.qr_mode} onValueChange={(value: any) => setFormData({...formData, qr_mode: value})}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Metode Validasi QR" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DYNAMIC">QR Dinamis (Otomatis ganti tiap 15 detik)</SelectItem>
                        <SelectItem value="STATIC">QR Statis (Satu QR untuk seluruh sesi)</SelectItem>
                        <SelectItem value="NONE">Tanpa QR (Hanya Geofencing + IP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Waktu Mulai Sesi <span className="text-red-500">*</span></Label>
                      <Input 
                        type="datetime-local" required value={formData.session_start} onChange={e => setFormData({...formData, session_start: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Waktu Selesai Sesi <span className="text-red-500">*</span></Label>
                      <Input 
                        type="datetime-local" required value={formData.session_end} onChange={e => setFormData({...formData, session_end: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Buka Check-in <span className="text-red-500">*</span></Label>
                      <Input 
                        type="datetime-local" required value={formData.check_in_open_at} onChange={e => setFormData({...formData, check_in_open_at: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tutup Check-in <span className="text-red-500">*</span></Label>
                      <Input 
                        type="datetime-local" required value={formData.check_in_close_at} onChange={e => setFormData({...formData, check_in_close_at: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Toleransi Terlambat (Menit) <span className="text-red-500">*</span></Label>
                      <Input 
                        type="number" min="0" required value={formData.late_threshold_minutes} onChange={e => setFormData({...formData, late_threshold_minutes: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="pb-2">
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" checked={formData.require_checkout} onChange={e => setFormData({...formData, require_checkout: e.target.checked})}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-950 dark:border-zinc-700"
                        />
                        <span className="ml-2 text-sm font-medium text-slate-700 dark:text-zinc-300">Wajib Check-out</span>
                      </label>
                    </div>
                  </div>

                  {editingSession && (
                    <div className="space-y-2">
                      <Label>Status Sesi (Override Manual)</Label>
                      <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPCOMING">UPCOMING</SelectItem>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="CLOSED">CLOSED</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Status biasanya diupdate otomatis oleh sistem (Cron Job).</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : (editingSession ? 'Simpan Perubahan' : 'Buat Sesi')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
