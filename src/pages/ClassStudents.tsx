import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { ArrowLeft, Plus, Search, Trash2, UserCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import AdminPageShell from '@/components/AdminPageShell';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/ui/TablePagination';
import type { ClassItem } from '@/types/class';
import type { User } from '@/types/user';
import { classDetailLine, formatClassLabel } from '@/lib/classLabel';
import { toastErrorMessage } from '@/lib/toastMessage';

type EnrollmentOptions = {
  students: Pick<User, 'id' | 'name' | 'nim_nip' | 'email' | 'is_active' | 'department'>[];
};

export default function ClassStudents() {
  const { classId = '' } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [removingStudent, setRemovingStudent] = useState(false);
  const [isEnrollConfirmOpen, setIsEnrollConfirmOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);
  const [availableStudents, setAvailableStudents] = useState<EnrollmentOptions['students']>([]);

  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);

  const classSwr = useSWR<ClassItem>(classId ? `/classes/${classId}` : null, fetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: classInfo,
    isInitialLoading: loadingClass,
    isError: classError,
    retry: retryClass,
    error: classErr,
  } = useSwrPageState(classSwr);

  const studentsSwr = useSWR<User[]>(classId ? `/classes/${classId}/students` : null, fetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: students = [],
    isInitialLoading: loadingStudents,
    isError: studentsError,
    retry: retryStudents,
    mutate: mutateStudents,
  } = useSwrPageState(studentsSwr);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void api
      .get('/classes/enrollment-options')
      .then((res) => {
        if (!cancelled) setAvailableStudents(res.data.data?.students ?? []);
      })
      .catch(() => {
        if (!cancelled) setAvailableStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nim_nip && s.nim_nip.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [students, searchTerm]);

  const {
    paginatedItems: paginatedStudents,
    meta: paginationMeta,
    setPage,
  } = useClientPagination(filteredStudents, {
    pageSize: 10,
    resetDeps: [searchTerm],
  });

  const notEnrolled = useMemo(
    () => availableStudents.filter((s) => !students.some((e) => e.id === s.id)),
    [availableStudents, students],
  );

  const selectedStudentName =
    notEnrolled.find((s) => s.id === selectedStudentId)?.name ?? 'mahasiswa ini';

  const handleEnroll = async () => {
    if (!selectedStudentId || !classId || enrolling) return;
    setEnrolling(true);
    try {
      await api.post(`/classes/${classId}/enroll`, { student_ids: [selectedStudentId] });
      toast.success('Mahasiswa berhasil ditambahkan');
      setSelectedStudentId('');
      setIsEnrollConfirmOpen(false);
      await mutateStudents();
      void classSwr.mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Gagal menambahkan mahasiswa'));
    } finally {
      setEnrolling(false);
    }
  };

  const confirmRemove = async () => {
    if (!classId || !studentToRemove || removingStudent) return;
    setRemovingStudent(true);
    try {
      await api.delete(`/classes/${classId}/enroll/${studentToRemove.id}`);
      toast.success('Mahasiswa berhasil dikeluarkan');
      setIsRemoveConfirmOpen(false);
      setStudentToRemove(null);
      await mutateStudents();
      void classSwr.mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Gagal mengeluarkan mahasiswa'));
    } finally {
      setRemovingStudent(false);
    }
  };

  const actionLabel = enrolling
    ? 'Mendaftarkan mahasiswa…'
    : removingStudent
      ? 'Mengeluarkan mahasiswa…'
      : null;

  if (!classId) {
    return (
      <AdminPageShell title="Kelas tidak ditemukan" variant="plain">
        <Button variant="outline" onClick={() => navigate('/classes')}>
          Kembali ke daftar kelas
        </Button>
      </AdminPageShell>
    );
  }

  if (classError && !classInfo) {
    const status = (classErr as { response?: { status?: number } })?.response?.status;
    return (
      <AdminPageShell title="Gagal memuat kelas" variant="plain">
        <ErrorWithRetry
          title={status === 403 ? 'Anda tidak memiliki akses ke kelas ini' : 'Gagal memuat data kelas'}
          error={classSwr.error}
          onRetry={retryClass}
        />
        <Button variant="outline" className="mt-4" onClick={() => navigate('/classes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Kelas
        </Button>
      </AdminPageShell>
    );
  }

  const detail = classDetailLine(classInfo);
  const semLabel = classInfo ? formatClassLabel(classInfo) : '';

  return (
    <>
      <ActionLoadingOverlay show={!!actionLabel} label={actionLabel ?? ''} />
      <AdminPageShell
        title="Daftar Mahasiswa Kelas"
        description="Kelola mahasiswa terdaftar di kelas ini."
        variant="plain"
        icon={<UserCircle className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => navigate('/classes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Kelas
          </Button>
        }
      >
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
          <div className="border-b-4 border-brand bg-muted/30 px-5 py-5 sm:px-6">
            {loadingClass ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : classInfo ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kelas</p>
                <h2 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{classInfo.name}</h2>
                {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {semLabel ? <Badge variant="outline">{semLabel}</Badge> : null}
                  <span>
                    Diampu oleh: <strong className="text-foreground">{classInfo.lecturer.name}</strong>
                  </span>
                  <Badge variant="secondary">{classInfo._count.enrollments} mahasiswa</Badge>
                </div>
              </>
            ) : null}
          </div>

          {canManage ? (
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Tambah mahasiswa ke kelas</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mahasiswa…" />
                  </SelectTrigger>
                  <SelectContent>
                    {notEnrolled.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Semua mahasiswa sudah terdaftar
                      </SelectItem>
                    ) : (
                      notEnrolled.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.nim_nip || 'tanpa NIM'})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={!selectedStudentId || notEnrolled.length === 0}
                onClick={() => setIsEnrollConfirmOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Siswa
              </Button>
            </div>
          ) : null}

          <div className="p-5">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama, NIM, atau email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label="Cari mahasiswa"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Daftar Siswa Kelas</h3>
          </div>

          {studentsError ? (
            <div className="p-5">
              <ErrorWithRetry title="Gagal memuat mahasiswa" error={studentsSwr.error} onRetry={retryStudents} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>NIM</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStudents ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-10 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <AdminEmptyState
                            compact
                            icon={UserCircle}
                            title={searchTerm.trim() ? 'Tidak ada hasil' : 'Belum ada mahasiswa'}
                            description={
                              searchTerm.trim()
                                ? 'Ubah kata kunci pencarian.'
                                : canManage
                                  ? 'Tambahkan mahasiswa menggunakan formulir di atas.'
                                  : 'Belum ada mahasiswa terdaftar di kelas ini.'
                            }
                            className="border-0 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedStudents.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell className="text-muted-foreground">
                            {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{student.nim_nip || '—'}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                          <TableCell>
                            <Badge variant={student.is_active ? 'secondary' : 'outline'}>
                              {student.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isSuperAdmin ? (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to="/users" title="Kelola di menu Pengguna">
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="sr-only">Kelola pengguna</span>
                                  </Link>
                                </Button>
                              ) : null}
                              {canManage ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setStudentToRemove({ id: student.id, name: student.name });
                                    setIsRemoveConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Keluarkan
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination meta={paginationMeta} onPageChange={setPage} itemLabel="mahasiswa" />
            </>
          )}
        </div>
      </AdminPageShell>

      <ConfirmModal
        isOpen={isEnrollConfirmOpen}
        onClose={() => setIsEnrollConfirmOpen(false)}
        onConfirm={() => void handleEnroll()}
        title="Tambah mahasiswa ke kelas?"
        description={`${selectedStudentName} akan didaftarkan ke kelas "${classInfo?.name ?? ''}".`}
        confirmText="Ya, Tambahkan"
        variant="primary"
        loading={enrolling}
        loadingText="Mendaftarkan…"
      />

      <ConfirmModal
        isOpen={isRemoveConfirmOpen}
        onClose={() => {
          setIsRemoveConfirmOpen(false);
          setStudentToRemove(null);
        }}
        onConfirm={() => void confirmRemove()}
        title="Keluarkan mahasiswa dari kelas?"
        description={
          studentToRemove
            ? `${studentToRemove.name} akan dikeluarkan dari kelas ini. Riwayat absensi tidak terhapus.`
            : 'Mahasiswa akan dikeluarkan dari kelas ini.'
        }
        confirmText="Ya, Keluarkan"
        variant="danger"
        loading={removingStudent}
        loadingText="Mengeluarkan…"
      />
    </>
  );
}
