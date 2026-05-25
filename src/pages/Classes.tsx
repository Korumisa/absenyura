import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { TablePagination } from '@/components/ui/TablePagination';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, BookOpen } from 'lucide-react';
import ClassCard from '@/components/classes/ClassCard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmModal } from '@/components/ConfirmModal';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { toastErrorMessage } from '@/lib/toastMessage';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import type { ClassItem } from '@/types/class';
import type { User } from '@/types/user';

export default function Classes() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [lecturers, setLecturers] = useState<User[]>([]);
  const [subjectsData, setSubjectsData] = useState<{ code: string; name: string }[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '', semester: 1, course_code: '', description: '', lecturer_id: ''
  });

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  // Loading state untuk aksi tulis
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Save confirmation
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const swr = useSWR<ClassItem[]>('/classes', fetcher, { revalidateOnFocus: false });
  const { data: classes = [], isInitialLoading: loading, isError, retry, mutate } = useSwrPageState(swr);
  const hasSearch = Boolean(searchTerm.trim());

  const fetchLecturers = async () => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      try {
        const res = await api.get('/classes/enrollment-options');
        setLecturers(res.data.data?.lecturers ?? []);
      } catch (error) {
        console.error('Failed to fetch lecturers');
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
        lecturer_id: cls.lecturer_id,
      });
    } else {
      setEditingClass(null);
      setFormData({
        name: '',
        semester: 1,
        course_code: '',
        description: '',
        lecturer_id: currentUser?.role === 'ADMIN' ? currentUser.id : '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!formData.lecturer_id) {
      toast.error('Silakan pilih dosen pengampu');
      return;
    }
    setSaving(true);
    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, formData);
        toast.success('Kelas berhasil diperbarui');
      } else {
        await api.post('/classes', formData);
        toast.success('Kelas berhasil ditambahkan');
      }
      setIsSaveConfirmOpen(false);
      setIsModalOpen(false);
      mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Terjadi kesalahan'));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setClassToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/classes/${classToDelete}`);
      toast.success('Kelas berhasil dihapus');
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
      mutate();
    } catch (error) {
      toast.error('Gagal menghapus kelas');
    } finally {
      setDeleting(false);
    }
  };

  const openClassStudents = (classId: string) => {
    navigate(`/classes/${classId}`);
  };

  const actionOverlayLabel = saving
    ? (editingClass ? 'Menyimpan perubahan kelas…' : 'Menambah kelas…')
    : deleting
      ? 'Menghapus kelas…'
      : null;

  const semesterOptions = useMemo(() => {
    const set = new Set(classes.map((c) => c.semester).filter((s) => s != null));
    return Array.from(set).sort((a, b) => a - b);
  }, [classes]);

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.course_code && c.course_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.lecturer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = semesterFilter === 'ALL' || String(c.semester) === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  const canManage = currentUser?.role !== 'USER';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const {
    paginatedItems: paginatedClasses,
    meta: classesPaginationMeta,
    setPage: setClassesPage,
  } = useClientPagination(filteredClasses, {
    pageSize: 12,
    resetDeps: [searchTerm],
  });

  return (
    <>
    <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
    <AdminPageShell
      title="Manajemen Kelas"
      description="Pilih kartu kelas untuk melihat dan mengelola daftar mahasiswa terdaftar."
      variant="plain"
      icon={<BookOpen className="h-5 w-5" />}
      actions={
        currentUser?.role !== 'USER' ? (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Kelas Baru
          </Button>
        ) : null
      }
    >
      {isError ? (
        <ErrorWithRetry title="Gagal memuat kelas" error={swr.error} onRetry={retry} />
      ) : (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama kelas, kode MK, atau dosen…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {semesterOptions.length > 1 ? (
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua semester</SelectItem>
                {semesterOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="grid items-stretch gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Daftar kelas">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-full min-h-[220px] flex-col rounded-2xl border border-border p-5">
                  <Skeleton className="mb-4 h-14 w-14 rounded-full" />
                  <Skeleton className="mb-2 h-6 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            : filteredClasses.length === 0 ? (
                <div className="col-span-full">
                  <AdminEmptyState
                    compact
                    icon={BookOpen}
                    title={hasSearch || semesterFilter !== 'ALL' ? 'Tidak ada hasil' : 'Belum ada kelas'}
                    description={
                      hasSearch || semesterFilter !== 'ALL'
                        ? 'Ubah filter atau kata kunci pencarian.'
                        : canManage
                          ? 'Buat kelas baru untuk mengelola mahasiswa dan sesi.'
                          : 'Anda belum terdaftar di kelas manapun.'
                    }
                  />
                </div>
              )
            : paginatedClasses.map((c) => (
                <ClassCard
                  key={c.id}
                  classItem={c}
                  canManage={canManage}
                  isSuperAdmin={isSuperAdmin}
                  onOpen={() => openClassStudents(c.id)}
                  onEdit={canManage ? () => handleOpenModal(c) : undefined}
                  onDelete={isSuperAdmin ? () => openDeleteConfirm(c.id) : undefined}
                />
              ))}
        </div>
        <TablePagination
          meta={classesPaginationMeta}
          onPageChange={setClassesPage}
          itemLabel="kelas"
        />
      </div>
      )}

      {/* Modal Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="border-b border-border px-6 py-4 border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
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
                    onValueChange={(val) => {
                      const selectedSubject = subjectsData.find((s) => s.code === val);
                      if (selectedSubject) {
                        setFormData({
                          ...formData,
                          course_code: selectedSubject.code,
                          name: selectedSubject.name,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mata Kuliah" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsData.map((s) => (
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
                <p className="text-xs text-muted-foreground">Bisa diisi nama mata kuliah beserta grup/kelasnya (misal: Algoritma Kelas B).</p>
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
                <p className="text-xs text-muted-foreground">Digunakan sebagai label “Sem X” di semua pilihan kelas.</p>
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
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                  Batal
                </Button>
                <Button type="button" onClick={() => setIsSaveConfirmOpen(true)} disabled={saving} aria-busy={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={() => {
          void handleSubmit({ preventDefault: () => {} } as React.FormEvent);
        }}
        title={editingClass ? 'Simpan perubahan kelas?' : 'Tambah kelas baru?'}
        description={
          editingClass
            ? `Perubahan pada kelas "${formData.name || editingClass.name}" akan disimpan.`
            : `Kelas "${formData.name || 'tanpa nama'}" akan ditambahkan ke sistem.`
        }
        confirmText={editingClass ? 'Ya, Simpan' : 'Ya, Tambah'}
        variant="primary"
        loading={saving}
        loadingText="Menyimpan…"
      />

      {/* Delete Class Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteClass}
        title="Konfirmasi Hapus Kelas"
        description="Apakah Anda yakin ingin menghapus kelas ini? Semua data pendaftaran (enrollment) mahasiswa akan ikut terhapus secara permanen."
        confirmText="Ya, Hapus Kelas"
        variant="danger"
        loading={deleting}
        loadingText="Menghapus…"
      />
    </AdminPageShell>
    </>
  );
}
