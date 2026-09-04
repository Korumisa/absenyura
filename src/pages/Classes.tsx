import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import { LastSavedIndicator } from '@/components/admin/LastSavedIndicator';
import { TablePagination } from '@/components/ui/TablePagination';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, BookOpen, Pencil, Trash2 } from 'lucide-react';
import ClassCard from '@/components/classes/ClassCard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmModal } from '@/components/ConfirmModal';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { useMutationToast } from '@/hooks/useMutationToast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import { AdminTableShell, adminTableHeaderClass } from '@/components/admin/AdminTableShell';
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
    name: '',
    semester: 1,
    course_code: '',
    description: '',
    lecturer_id: '',
  });

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  // Loading state untuk aksi tulis
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Save confirmation
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formBaseline, setFormBaseline] = useState<string>('');

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const swr = useSWR<ClassItem[]>('/classes', fetcher, { revalidateOnFocus: false });
  const {
    data: classes = [],
    isPending: loading,
    isError,
    showSlowLoadingHint,
    retry,
    mutate,
  } = useSwrPageState(swr);
  const hasSearch = Boolean(searchTerm.trim());

  const doSaveClass = useMutationToast(
    async () => {
      if (editingClass) {
        return api.put(`/classes/${editingClass.id}`, formData);
      }
      return api.post('/classes', formData);
    },
    {
      successMsg: editingClass ? 'Kelas berhasil diperbarui' : 'Kelas berhasil ditambahkan',
      errorMsg: (err) => toastErrorMessage(err, 'Terjadi kesalahan'),
      onSuccess: () => setLastSavedAt(new Date()),
    }
  );

  const doDeleteClass = useMutationToast(() => api.delete(`/classes/${classToDelete}`), {
    successMsg: 'Kelas berhasil dihapus',
    errorMsg: () => 'Gagal menghapus kelas',
  });

  const fetchLecturers = useCallback(async () => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      try {
        const res = await api.get('/classes/enrollment-options');
        setLecturers(res.data.data?.lecturers ?? []);
      } catch (error) {
        console.error('Failed to fetch lecturers');
      }
    }
  }, [currentUser]);

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
  }, [fetchLecturers]);

  const handleOpenModal = (cls: ClassItem | null = null) => {
    if (cls) {
      const initial = {
        name: cls.name,
        semester: cls.semester || 1,
        course_code: cls.course_code || '',
        description: cls.description || '',
        lecturer_id: cls.lecturer_id,
      };
      setEditingClass(cls);
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    } else {
      const initial = {
        name: '',
        semester: 1,
        course_code: '',
        description: '',
        lecturer_id: currentUser?.role === 'ADMIN' ? currentUser.id : '',
      };
      setEditingClass(null);
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    }
    setLastSavedAt(null);
    setIsModalOpen(true);
  };

  const formIsDirty = JSON.stringify(formData) !== formBaseline;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!formData.lecturer_id) {
      toast.error('Silakan pilih dosen pengampu');
      return;
    }
    setSaving(true);
    try {
      const result = await doSaveClass();
      if (result !== undefined) {
        setIsSaveConfirmOpen(false);
        setIsModalOpen(false);
        mutate();
      }
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
      const result = await doDeleteClass();
      if (result !== undefined) {
        setIsDeleteModalOpen(false);
        setClassToDelete(null);
        mutate();
      }
    } finally {
      setDeleting(false);
    }
  };

  const openClassStudents = (classId: string) => {
    navigate(`/classes/${classId}`);
  };

  const actionOverlayLabel = saving
    ? editingClass
      ? 'Menyimpan perubahan kelas…'
      : 'Menambah kelas…'
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
        icon={<BookOpen className="size-5" />}
        actions={
          currentUser?.role !== 'USER' ? (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="size-4 mr-2" />
              Buat Kelas Baru
            </Button>
          ) : null
        }
      >
        {isError ? (
          <ErrorWithRetry title="Gagal memuat kelas" error={swr.error} onRetry={retry} />
        ) : showSlowLoadingHint ? (
          <SlowLoadingHint onRetry={retry} />
        ) : (
          <AdminTableShell
            filter={
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
            }
            mobile={
              loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex h-full min-h-[220px] flex-col rounded-2xl border border-border p-5"
                    >
                      <Skeleton className="mb-4 size-14 rounded-full" />
                      <Skeleton className="mb-2 h-6 w-40" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))}
                </div>
              ) : filteredClasses.length === 0 ? (
                <AdminEmptyState
                  compact
                  icon={BookOpen}
                  title={
                    hasSearch || semesterFilter !== 'ALL' ? 'Tidak ada hasil' : 'Belum ada kelas'
                  }
                  description={
                    hasSearch || semesterFilter !== 'ALL'
                      ? 'Ubah filter atau kata kunci pencarian.'
                      : canManage
                        ? 'Buat kelas baru untuk mengelola mahasiswa dan sesi.'
                        : 'Anda belum terdaftar di kelas manapun.'
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {paginatedClasses.map((c) => (
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
              )
            }
            footer={
              <TablePagination
                meta={classesPaginationMeta}
                onPageChange={setClassesPage}
                itemLabel="kelas"
              />
            }
          >
            <Table>
              <TableHeader className={adminTableHeaderClass}>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Kode MK</TableHead>
                  <TableHead>Pengampu</TableHead>
                  <TableHead className="text-right">Mahasiswa</TableHead>
                  <TableHead className="text-right">Sesi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <AdminEmptyState
                        compact
                        icon={BookOpen}
                        title={
                          hasSearch || semesterFilter !== 'ALL'
                            ? 'Tidak ada hasil'
                            : 'Belum ada kelas'
                        }
                        description={
                          hasSearch || semesterFilter !== 'ALL'
                            ? 'Ubah filter atau kata kunci pencarian.'
                            : canManage
                              ? 'Buat kelas baru untuk mengelola mahasiswa dan sesi.'
                              : 'Anda belum terdaftar di kelas manapun.'
                        }
                        className="border-0 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClasses.map((c, idx) => (
                    <TableRow
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openClassStudents(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') openClassStudents(c.id);
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="text-muted-foreground">
                        {(classesPaginationMeta.page - 1) * classesPaginationMeta.limit + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">Sem {c.semester}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {c.course_code || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.lecturer.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c._count.enrollments}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c._count.sessions}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canManage ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9"
                              onClick={() => handleOpenModal(c)}
                              title="Edit kelas"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          {isSuperAdmin ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 text-destructive hover:text-destructive"
                              onClick={() => openDeleteConfirm(c.id)}
                              title="Hapus kelas"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AdminTableShell>
        )}

        {/* Modal Form */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg p-0">
            <div className="border-b border-border px-6 py-4 border-border">
              <div className="flex items-start justify-between gap-3">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Form kelas</DialogDescription>
                </DialogHeader>
                <LastSavedIndicator
                  lastSavedAt={lastSavedAt}
                  isDirty={formIsDirty}
                  isSaving={saving}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <FormField id="class-course" label="Pilih Mata Kuliah" required>
                {(fieldProps) =>
                  subjectsData.length > 0 ? (
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
                      <SelectTrigger id={fieldProps.id}>
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
                      Anda belum menambahkan Mata Kuliah di menu Fakultas & Prodi. Silakan tambahkan
                      terlebih dahulu.
                    </div>
                  )
                }
              </FormField>
              <FormField
                id="class-name"
                label="Nama Kelas Spesifik"
                required
                description="Bisa diisi nama mata kuliah beserta grup/kelasnya (misal: Algoritma Kelas B)."
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pemrograman Web (A)"
                  />
                )}
              </FormField>
              <FormField
                id="class-semester"
                label="Semester"
                required
                description="Digunakan sebagai label “Sem X” di semua pilihan kelas."
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="number"
                    min={1}
                    max={14}
                    required
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        semester: Math.max(
                          1,
                          Math.min(14, Number.parseInt(e.target.value || '1', 10) || 1)
                        ),
                      }))
                    }
                  />
                )}
              </FormField>
              <FormField id="class-description" label="Deskripsi (Opsional)">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                )}
              </FormField>
              <FormField id="class-lecturer" label="Dosen Pengampu" required>
                {(fieldProps) => (
                  <Select
                    required
                    value={formData.lecturer_id}
                    onValueChange={(val) => setFormData({ ...formData, lecturer_id: val })}
                    disabled={currentUser?.role !== 'SUPER_ADMIN'}
                  >
                    <SelectTrigger id={fieldProps.id}>
                      <SelectValue placeholder="Pilih Dosen" />
                    </SelectTrigger>
                    <SelectContent>
                      {lecturers.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Batal
                </Button>
                <SubmitButton
                  type="button"
                  onClick={() => setIsSaveConfirmOpen(true)}
                  disabled={saving}
                  isLoading={saving}
                  label="Simpan"
                  loadingLabel="Menyimpan…"
                  className={
                    formIsDirty
                      ? 'ring-2 ring-offset-2 ring-sky-500/70 focus-visible:outline-none dark:ring-offset-slate-900'
                      : undefined
                  }
                />
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
