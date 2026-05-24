import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { MobileTableHint } from '@/components/ui/MobileTableHint';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import type { ClassItem } from '@/types/class';
import type { User } from '@/types/user';

export default function Classes() {
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  
  // Enroll Modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const [lecturers, setLecturers] = useState<User[]>([]);
  const [subjectsData, setSubjectsData] = useState<{code: string, name: string}[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '', semester: 1, course_code: '', description: '', lecturer_id: ''
  });

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const swr = useSWR<ClassItem[]>('/classes', fetcher, { revalidateOnFocus: false });
  const { data: classes = [], isInitialLoading: loading, isError, retry, mutate } = useSwrPageState(swr);
  const hasSearch = Boolean(searchTerm.trim());

  const fetchLecturers = async () => {
    if (currentUser?.role !== 'USER') {
      try {
        const res = await api.get('/users');
        setLecturers(res.data.data.filter((u: any) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'));
        setAllStudents(res.data.data.filter((u: any) => u.role === 'USER'));
      } catch (error) {
        console.error('Failed to fetch users');
      }
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/settings/subjects');
      if (res.data.data) {
        setSubjectsData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subjects');
    }
  };

  useEffect(() => {
    fetchLecturers();
    fetchSubjects();
  }, [currentUser]);

  const handleOpenModal = (cls: ClassItem | null = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        semester: cls.semester || 1,
        course_code: cls.course_code || '',
        description: cls.description || '',
        lecturer_id: cls.lecturer_id
      });
    } else {
      setEditingClass(null);
      setFormData({
        name: '', semester: 1, course_code: '', description: '', lecturer_id: currentUser?.role === 'ADMIN' ? currentUser.id : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lecturer_id) {
      toast.error('Silakan pilih dosen pengampu');
      return;
    }
    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, formData);
        toast.success('Kelas berhasil diperbarui');
      } else {
        await api.post('/classes', formData);
        toast.success('Kelas berhasil ditambahkan');
      }
      setIsModalOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const openDeleteConfirm = (id: string) => {
    setClassToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await api.delete(`/classes/${classToDelete}`);
      toast.success('Kelas berhasil dihapus');
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
      mutate();
    } catch (error) {
      toast.error('Gagal menghapus kelas');
    }
  };

  const handleOpenEnrollModal = async (classId: string) => {
    setSelectedClassId(classId);
    setIsEnrollModalOpen(true);
    try {
      const res = await api.get(`/classes/${classId}/students`);
      setEnrolledStudents(res.data.data);
    } catch (error) {
      toast.error('Gagal mengambil data mahasiswa kelas ini');
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudentId || !selectedClassId) return;
    try {
      await api.post(`/classes/${selectedClassId}/enroll`, { student_ids: [selectedStudentId] });
      toast.success('Mahasiswa berhasil ditambahkan');
      const res = await api.get(`/classes/${selectedClassId}/students`);
      setEnrolledStudents(res.data.data);
      mutate();
      setSelectedStudentId('');
    } catch (error) {
      toast.error('Gagal menambahkan mahasiswa');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClassId) return;
    try {
      await api.delete(`/classes/${selectedClassId}/enroll/${studentId}`);
      toast.success('Mahasiswa berhasil dikeluarkan');
      setEnrolledStudents(prev => prev.filter(s => s.id !== studentId));
      mutate();
    } catch (error) {
      toast.error('Gagal mengeluarkan mahasiswa');
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.course_code && c.course_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminPageShell
      title="Manajemen Kelas"
      description="Atur kelas, dosen pengampu, dan daftar mahasiswa."
      variant="plain"
      icon={<BookOpen className="h-5 w-5" />}
      actions={
        currentUser?.role !== 'USER' ? (
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Buat Kelas Baru
          </Button>
        ) : null
      }
    >
      {isError ? (
        <ErrorWithRetry title="Gagal memuat kelas" error={swr.error} onRetry={retry} />
      ) : (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari nama kelas atau kode mata kuliah..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ul className="space-y-3 p-4 md:hidden" aria-label="Daftar kelas">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
                  <Skeleton className="mb-2 h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </li>
              ))
            : filteredClasses.length === 0 ? (
                <li>
                  <AdminEmptyState
                    compact
                    icon={BookOpen}
                    title={hasSearch ? 'Tidak ada hasil' : 'Belum ada kelas'}
                    description={
                      hasSearch
                        ? 'Ubah kata kunci pencarian.'
                        : 'Buat kelas baru untuk mengelola mahasiswa dan sesi.'
                    }
                  />
                </li>
              )
            : filteredClasses.map((c) => (
                <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start gap-2">
                    <BookOpen size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-sm text-slate-500">{c.course_code || '—'} · Semester {c.semester}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Dosen: {c.lecturer.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{c._count.enrollments} mahasiswa</Badge>
                        <Badge variant="outline">{c._count.sessions} sesi</Badge>
                      </div>
                    </div>
                  </div>
                  {currentUser?.role !== 'USER' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" className="min-h-11 flex-1" onClick={() => handleOpenEnrollModal(c.id)}>
                        <Users className="mr-2 h-4 w-4" />
                        Mahasiswa
                      </Button>
                      <Button variant="outline" className="min-h-11 flex-1" onClick={() => handleOpenModal(c)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {currentUser?.role === 'SUPER_ADMIN' ? (
                        <Button
                          variant="outline"
                          className="min-h-11 w-full text-red-600 sm:w-auto"
                          onClick={() => openDeleteConfirm(c.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
        </ul>

        <MobileTableHint />
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
              <TableRow>
                <TableHead>Mata Kuliah / Kelas</TableHead>
                <TableHead>Dosen Pengampu</TableHead>
                <TableHead>Jumlah Mahasiswa</TableHead>
                <TableHead>Jumlah Sesi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <AdminEmptyState
                      compact
                      icon={BookOpen}
                      title={hasSearch ? 'Tidak ada hasil' : 'Belum ada kelas'}
                      description={
                        hasSearch
                          ? 'Ubah kata kunci pencarian.'
                          : 'Buat kelas baru untuk mengelola mahasiswa dan sesi.'
                      }
                      className="border-0 shadow-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        <BookOpen size={16} className="text-indigo-500" />
                        <span className="truncate">{c.name}</span>
                        <Badge variant="outline" className="h-6 rounded-full px-2 text-[11px] font-semibold">
                          Sem {c.semester}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        {c.course_code || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300">
                      {c.lecturer.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {c._count.enrollments} Mahasiswa
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {c._count.sessions} Sesi
                      </Badge>
                    </TableCell>
                    {currentUser?.role !== 'USER' ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenEnrollModal(c.id)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            title="Kelola Mahasiswa"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenModal(c)}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {currentUser?.role === 'SUPER_ADMIN' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openDeleteConfirm(c.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    ) : (
                      <TableCell className="text-right">-</TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {/* Modal Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">
                {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </DialogTitle>
              <DialogDescription className="sr-only">Form kelas</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <div className="space-y-2">
                <Label>Pilih Mata Kuliah <span className="text-red-500">*</span></Label>
                {subjectsData.length > 0 ? (
                  <Select 
                    required 
                    value={formData.course_code} 
                    onValueChange={val => {
                      const selectedSubject = subjectsData.find(s => s.code === val);
                      if (selectedSubject) {
                        setFormData({
                          ...formData, 
                          course_code: selectedSubject.code,
                          name: selectedSubject.name // Auto-fill class name with subject name
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mata Kuliah" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsData.map(s => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    Anda belum menambahkan Mata Kuliah di menu Fakultas & Prodi. Silakan tambahkan terlebih dahulu.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nama Kelas Spesifik <span className="text-red-500">*</span></Label>
                <Input 
                  type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: Pemrograman Web (A)"
                />
                <p className="text-xs text-slate-500">Bisa diisi nama mata kuliah beserta grup/kelasnya (misal: Algoritma Kelas B).</p>
              </div>
              <div className="space-y-2">
                <Label>Semester <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  max={14}
                  required
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, semester: Math.max(1, Math.min(14, Number.parseInt(e.target.value || '1', 10) || 1)) }))
                  }
                />
                <p className="text-xs text-slate-500">Digunakan sebagai label “Sem X” di semua pilihan kelas.</p>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (Opsional)</Label>
                <Input 
                  type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Dosen Pengampu <span className="text-red-500">*</span></Label>
                <Select 
                  required value={formData.lecturer_id} onValueChange={val => setFormData({...formData, lecturer_id: val})}
                  disabled={currentUser?.role !== 'SUPER_ADMIN'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Dosen" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter className="mt-8 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Simpan
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enroll Modal */}
      <Dialog
        open={Boolean(isEnrollModalOpen && selectedClassId)}
        onOpenChange={(open) => {
          setIsEnrollModalOpen(open);
          if (!open) setSelectedClassId(null);
        }}
      >
        <DialogContent className="max-w-2xl p-0">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">Daftar Mahasiswa</DialogTitle>
              <DialogDescription className="sr-only">Kelola enrollment mahasiswa</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-6">
              {currentUser?.role !== 'USER' && (
                <div className="flex items-end gap-3">
                  <div className="space-y-2 flex-1">
                    <Label>Tambahkan Mahasiswa Baru</Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Mahasiswa" />
                      </SelectTrigger>
                      <SelectContent>
                        {allStudents
                          .filter(s => !enrolledStudents.some(es => es.id === s.id))
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.nim_nip || '-'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleEnrollStudent} disabled={!selectedStudentId}>
                    Tambahkan
                  </Button>
                </div>
              )}

              <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-y-auto flex-1 mt-4">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-zinc-900 sticky top-0">
                    <TableRow>
                      <TableHead>Nama Mahasiswa</TableHead>
                      <TableHead>NIM</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolledStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">Belum ada mahasiswa di kelas ini.</TableCell>
                      </TableRow>
                    ) : (
                      enrolledStudents.map(student => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium text-slate-800 dark:text-zinc-200">{student.name}</TableCell>
                          <TableCell className="text-slate-500 dark:text-zinc-400">{student.nim_nip || '-'}</TableCell>
                          <TableCell className="text-right">
                            {currentUser?.role !== 'USER' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveStudent(student.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 px-2"
                              >
                                Keluarkan
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Class Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteClass}
        title="Konfirmasi Hapus Kelas"
        description="Apakah Anda yakin ingin menghapus kelas ini? Semua data pendaftaran (enrollment) mahasiswa akan ikut terhapus secara permanen."
        confirmText="Ya, Hapus Kelas"
        variant="danger"
      />
    </AdminPageShell>
  );
}
