import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Upload,
  Smartphone,
  Users as UsersIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { CardSkeletonList } from '@/components/admin/CardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { userRoleLabel } from '@/lib/utils/statusLabel';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { toast } from 'sonner';
import { useMutationToast } from '@/hooks/useMutationToast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { ConfirmModal } from '@/components/ConfirmModal';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import { TablePagination } from '@/components/ui/TablePagination';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useFacultyDirectory } from '@/hooks/useFacultyDirectory';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import type { User } from '@/types/user';
import type { PaginationMeta } from '@/types/common';
import { ClassMultiSelect, type ClassOption } from '@/components/ClassMultiSelect';
import { formatClassLabel } from '@/lib/utils/classLabel';
import { LastSavedIndicator } from '@/components/admin/LastSavedIndicator';

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination & Debounce State
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input at 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when debouncedSearch or other filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    is_active: true,
    department: '',
    nim_nip: '',
    phone: '',
    semester: 1,
  });
  const {
    facultiesData,
    departmentQuery,
    setDepartmentQuery,
    totalDepartments,
    filteredFacultiesData,
  } = useFacultyDirectory();
  const [classIds, setClassIds] = useState<string[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassOption[]>([]);

  // Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<string | null>(null);

  const fetcher = (url: string) => api.get(url).then((res) => res.data);
  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Loading state untuk aksi tulis
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formBaseline, setFormBaseline] = useState<string>('');

  const searchKey = useMemo(
    () =>
      new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: debouncedSearch.trim(),
        role: roleFilter,
        status: statusFilter,
      }).toString(),
    [page, debouncedSearch, roleFilter, statusFilter]
  );

  const swr = useSWR<{
    data?: User[];
    meta?: PaginationMeta | null;
    success?: boolean;
    message?: string;
  }>(`/users?${searchKey}`, fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
  const { isPending: loading, isError, showSlowLoadingHint, retry } = useSwrPageState(swr);
  const { data, mutate, isValidating } = swr;

  const users: User[] = Array.isArray(data?.data) ? data.data : [];
  const meta: PaginationMeta | null = data?.meta || null;

  const doSaveUser = useMutationToast(
    async () => {
      const payload = {
        ...formData,
        class_ids: formData.role === 'USER' ? classIds : [],
      };
      if (editingUser) {
        const res = await api.put(`/users/${editingUser.id}`, payload);
        return res.data;
      }
      const res = await api.post('/users', payload);
      return res.data;
    },
    {
      successMsg: (resData: any) => {
        if (editingUser) {
          const added = resData?.data?.enrolled_added ?? 0;
          return added > 0
            ? `Pengguna diperbarui dan ditambahkan ke ${added} kelas`
            : 'Pengguna berhasil diperbarui';
        }
        const enrolled = resData?.data?.enrolled_classes ?? 0;
        return enrolled > 0
          ? `Pengguna ditambahkan dan didaftarkan ke ${enrolled} kelas`
          : 'Pengguna berhasil ditambahkan';
      },
      errorMsg: (err) => toastErrorMessage(err, 'Terjadi kesalahan'),
      onSuccess: () => setLastSavedAt(new Date()),
    }
  );

  const handleOpenModal = async (user: User | null = null) => {
    setClassIds([]);
    setEnrolledClasses([]);
    setShowPassword(false);
    if (user) {
      const initial = {
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        nim_nip: user.nim_nip || '',
        department: user.department || '',
        phone: user.phone || '',
        semester: user.semester || 1,
        is_active: user.is_active,
      };
      setEditingUser(user);
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
      if (user.role === 'USER') {
        try {
          const res = await api.get(`/users/${user.id}/enrollments`);
          setEnrolledClasses(res.data.data ?? []);
        } catch {
          toast.error('Gagal memuat kelas mahasiswa');
        }
      }
    } else {
      const initial = {
        name: '',
        email: '',
        password: '',
        role: 'USER',
        nim_nip: '',
        department: '',
        phone: '',
        semester: 1,
        is_active: true,
      };
      setEditingUser(null);
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    }
    setLastSavedAt(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await doSaveUser();
      if (result !== undefined) {
        setIsModalOpen(false);
        setClassIds([]);
        setEnrolledClasses([]);
        mutate();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${userToDelete}`);
      toast.success('Pengguna berhasil dihapus');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      mutate();
    } catch (error) {
      toast.error(toastErrorMessage(error, 'Gagal menghapus pengguna'));
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters =
    Boolean(debouncedSearch.trim()) || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  const roleBadgeProps = (role: string) => ({
    variant: (role === 'SUPER_ADMIN'
      ? 'default'
      : role === 'ADMIN'
        ? 'secondary'
        : role === 'CONTENT_ADMIN'
          ? 'warning'
          : 'outline') as 'default' | 'secondary' | 'warning' | 'outline',
    className:
      role === 'SUPER_ADMIN'
        ? 'bg-purple-600 hover:bg-purple-700'
        : role === 'ADMIN'
          ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600'
          : role === 'CONTENT_ADMIN'
            ? 'bg-amber-500 hover:bg-amber-600'
            : '',
  });

  const filteredUsers = users;

  const handleDownloadTemplate = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Mahasiswa');
    const importYear = new Date().getFullYear();

    sheet.columns = [
      { header: 'Nama Lengkap', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'NIM_NIP', key: 'nim', width: 20 },
      { header: 'Departemen', key: 'dept', width: 25 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'No_HP', key: 'phone', width: 20 },
      { header: 'Role (USER/ADMIN/CONTENT_ADMIN)', key: 'role', width: 26 },
      { header: 'Kelas (pisahkan dengan |)', key: 'classes', width: 34 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    // Example row
    sheet.addRow({
      name: 'Budi Santoso',
      email: 'budi@mhs.kampus.ac.id',
      nim: '210010101',
      dept: 'Teknik Informatika',
      semester: 1,
      phone: '081234567890',
      role: 'USER',
      classes: 'Kelas A | Kelas Praktikum A',
    });

    sheet.addRow([]);
    sheet.addRow({
      name: `Catatan: hasil import otomatis memakai enrollment_date 1 Agustus ${importYear}. Kelas dipisahkan dengan tanda | dan kelas baru otomatis dibuat atas akun pengimpor.`,
    });
    sheet.mergeCells(`A4:H4`);
    sheet.getCell('A4').font = { italic: true, color: { argb: 'FF475569' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Template_Import_Mahasiswa.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Silakan pilih file Excel terlebih dahulu');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await api.post('/users/import', formData);
      const importedAt = res.data?.data?.enrollment_date
        ? new Date(res.data.data.enrollment_date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : null;
      const classesCreated = Number(res.data?.data?.classes_created || 0);
      const enrollmentsCreated = Number(res.data?.data?.class_enrollments_created || 0);
      toast.success(
        importedAt
          ? `${res.data.message} Enrollment date default: ${importedAt}. Kelas baru: ${classesCreated}. Enrollment kelas: ${enrollmentsCreated}.`
          : res.data.message
      );
      setIsImportModalOpen(false);
      setImportFile(null);
      mutate(); // Refresh list
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Gagal mengimpor data Excel'));
    } finally {
      setImporting(false);
    }
  };

  const openResetConfirm = (id: string) => {
    setUserToReset(id);
    setIsResetModalOpen(true);
  };

  const confirmResetDevice = async () => {
    if (!userToReset || resetting) return;
    setResetting(true);
    try {
      await api.post(`/users/${userToReset}/reset-device`);
      toast.success('Perangkat berhasil di-reset');
      setIsResetModalOpen(false);
      setUserToReset(null);
      mutate();
    } catch (error) {
      toast.error(toastErrorMessage(error, 'Gagal mereset perangkat'));
    } finally {
      setResetting(false);
    }
  };

  const formIsDirty = JSON.stringify(formData) !== formBaseline;

  const actionOverlayLabel = saving
    ? editingUser
      ? 'Menyimpan perubahan pengguna…'
      : 'Menambah pengguna…'
    : deleting
      ? 'Menghapus pengguna…'
      : resetting
        ? 'Mereset perangkat…'
        : null;

  return (
    <>
      <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
      <AdminPageShell
        title="Manajemen Pengguna"
        description="Kelola user, import Excel, dan reset perangkat."
        variant="plain"
        icon={<UsersIcon className="size-5" />}
        actions={
          <>
            <Button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Upload size={18} className="mr-2" />
              Import Excel
            </Button>
            <Button type="button" onClick={() => handleOpenModal()}>
              <Plus size={18} className="mr-2" />
              Tambah Pengguna
            </Button>
          </>
        }
      >
        {isError ? (
          <ErrorWithRetry title="Gagal memuat pengguna" error={swr.error} onRetry={retry} />
        ) : showSlowLoadingHint ? (
          <SlowLoadingHint onRetry={retry} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div className="flex flex-col items-center justify-between gap-3 border-b border-border p-5 md:flex-row">
              <div className="relative w-full md:max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                <Input
                  type="text"
                  placeholder="Cari nama, email, atau NIM/NIP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Cari pengguna"
                />
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-[160px]" aria-label="Filter peran pengguna">
                    <SelectValue placeholder="Filter Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Peran</SelectItem>
                    <SelectItem value="USER">User / Mahasiswa</SelectItem>
                    <SelectItem value="ADMIN">Admin / Dosen</SelectItem>
                    <SelectItem value="CONTENT_ADMIN">Admin Konten</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className="w-full md:w-[150px]"
                    aria-label="Filter status pengguna"
                  >
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* [UX] #11 — daftar kartu di mobile */}
            <ul className="space-y-3 p-5 md:hidden" aria-label="Daftar pengguna">
              {loading ? (
                <li>
                  <CardSkeletonList count={4} />
                </li>
              ) : filteredUsers.length === 0 ? (
                <li>
                  <AdminEmptyState compact icon={UsersIcon} hasFilters={hasFilters} />
                </li>
              ) : (
                filteredUsers.map((user) => (
                  <li key={user.id} className="rounded-2xl border border-border bg-background p-4">
                    <p className="font-bold text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{user.nim_nip || '—'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {typeof user.department === 'object' && user.department !== null
                        ? (user.department as { name?: string; id?: string }).name ||
                          (user.department as { id?: string }).id
                        : user.department || '—'}
                      {user.role === 'USER' ? ` · Semester ${user.semester || 1}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge {...roleBadgeProps(user.role)}>{userRoleLabel(user.role)}</Badge>
                      <Badge variant={user.is_active ? 'success' : 'destructive'}>
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                      {user.device_bound || user.device_fingerprint ? (
                        <Badge variant="success" className="gap-1.5">
                          <Smartphone size={12} aria-hidden="true" />
                          Terikat
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Bebas</Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.device_bound || user.device_fingerprint ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-11 flex-1 border-orange-200 text-orange-600"
                          onClick={() => openResetConfirm(user.id)}
                        >
                          Reset perangkat
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => handleOpenModal(user)}
                      >
                        Edit
                      </Button>
                      {currentUser?.role === 'SUPER_ADMIN' && currentUser?.id !== user.id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="min-h-11 flex-1"
                          onClick={() => openDeleteConfirm(user.id)}
                        >
                          Hapus
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                  <TableRow>
                    <TableHead>Nama &amp; Email</TableHead>
                    <TableHead>NIM/NIP</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Departemen / Smt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Perangkat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <AdminEmptyState
                          compact
                          icon={UsersIcon}
                          hasFilters={hasFilters}
                          className="border-0 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-zinc-300">
                          {user.nim_nip || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge {...roleBadgeProps(user.role)}>{userRoleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-muted-foreground dark:text-zinc-300">
                            {typeof user.department === 'object' && user.department !== null
                              ? (user.department as any).name || (user.department as any).id
                              : user.department || '-'}
                          </div>
                          {user.role === 'USER' ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Semester {user.semester || 1}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'success' : 'destructive'}>
                            {user.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.device_bound || user.device_fingerprint ? (
                            <Badge variant="success" className="gap-1.5">
                              <Smartphone size={12} />
                              Terikat
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Bebas</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {user.device_bound || user.device_fingerprint ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openResetConfirm(user.id)}
                                className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-900 dark:text-orange-500 dark:hover:bg-orange-900/30"
                                title="Reset Perangkat (Mahasiswa akan diminta login ulang di perangkat baru)"
                              >
                                <Smartphone size={14} className="mr-1.5" />
                                Reset perangkat
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(user)}
                              className="text-muted-foreground hover:bg-indigo-50 hover:text-brand text-muted-foreground dark:hover:bg-indigo-900/30"
                              title="Edit"
                              aria-label={`Edit pengguna ${user.name}`}
                            >
                              <Edit2 size={16} />
                            </Button>
                            {currentUser?.role === 'SUPER_ADMIN' && currentUser?.id !== user.id ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteConfirm(user.id)}
                                className="text-muted-foreground hover:bg-red-50 hover:text-red-600 text-muted-foreground dark:hover:bg-red-900/30"
                                title="Hapus"
                                aria-label={`Hapus pengguna ${user.name}`}
                              >
                                <Trash2 size={16} />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {meta ? (
              <TablePagination
                meta={meta}
                onPageChange={setPage}
                disabled={isValidating}
                itemLabel="pengguna"
              />
            ) : null}
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl p-0">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Form pengguna</DialogDescription>
                </DialogHeader>
                <LastSavedIndicator
                  lastSavedAt={lastSavedAt}
                  isDirty={formIsDirty}
                  isSaving={saving}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField id="user-name" label="Nama Lengkap" required>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  )}
                </FormField>
                <FormField id="user-email" label="Email" required>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  )}
                </FormField>
                <FormField
                  id="user-password"
                  label={
                    <>
                      Kata Sandi{' '}
                      {editingUser ? (
                        <span className="text-xs font-normal text-slate-400">
                          (Kosongkan jika tidak diubah)
                        </span>
                      ) : null}
                    </>
                  }
                  required={!editingUser}
                >
                  {(fieldProps) => (
                    <div className="relative">
                      <Input
                        {...fieldProps}
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                        className="pr-12"
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  )}
                </FormField>
                <FormField id="user-role" label="Peran (Role)" required>
                  {(fieldProps) => (
                    <Select
                      value={formData.role}
                      onValueChange={(val) =>
                        setFormData({ ...formData, role: val, semester: val === 'USER' ? 1 : 0 })
                      }
                      disabled={currentUser?.role !== 'SUPER_ADMIN'}
                    >
                      <SelectTrigger id={fieldProps.id}>
                        <SelectValue placeholder="Pilih Peran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User / Mahasiswa</SelectItem>
                        <SelectItem value="ADMIN">Admin / Dosen</SelectItem>
                        {currentUser?.role === 'SUPER_ADMIN' ? (
                          <SelectItem value="CONTENT_ADMIN">Admin Konten</SelectItem>
                        ) : null}
                        {currentUser?.role === 'SUPER_ADMIN' ? (
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                <FormField id="user-nim-nip" label="NIM / NIP" required>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="text"
                      required
                      value={formData.nim_nip}
                      onChange={(e) => setFormData({ ...formData, nim_nip: e.target.value })}
                    />
                  )}
                </FormField>
                <FormField
                  id="user-department"
                  label="Departemen / Prodi"
                  required
                  description={
                    facultiesData.length === 0 ? (
                      <>
                        Data prodi belum tersedia. Tambahkan dulu di{' '}
                        <Link to="/master-data" className="font-medium text-brand hover:underline">
                          Master Data
                        </Link>
                        .
                      </>
                    ) : undefined
                  }
                >
                  {(fieldProps) => (
                    <Select
                      value={formData.department}
                      onValueChange={(val) => setFormData({ ...formData, department: val })}
                      disabled={facultiesData.length === 0}
                      onOpenChange={(open) => {
                        if (!open) setDepartmentQuery('');
                      }}
                    >
                      <SelectTrigger id={fieldProps.id}>
                        <SelectValue
                          placeholder={facultiesData.length ? 'Pilih Prodi' : 'Belum ada Prodi'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {totalDepartments > 10 ? (
                          <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                            <Input
                              value={departmentQuery}
                              onChange={(e) => setDepartmentQuery(e.target.value)}
                              placeholder="Cari prodi…"
                              className="h-9"
                            />
                          </div>
                        ) : null}
                        {filteredFacultiesData.length === 0 && departmentQuery.trim() ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground">
                            Tidak ada hasil
                          </div>
                        ) : null}
                        {filteredFacultiesData.map((f) => {
                          if (!f) return null;
                          return (
                            <SelectGroup key={f.name}>
                              <SelectLabel>{f.name}</SelectLabel>
                              {f.departments?.map((d) => {
                                const deptName =
                                  typeof d === 'object' && d !== null
                                    ? (d as any).name || (d as any).id
                                    : d;
                                return (
                                  <SelectItem key={deptName} value={deptName}>
                                    {deptName}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
                {formData.role === 'USER' ? (
                  <FormField id="user-semester" label="Semester" required>
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        type="number"
                        required
                        min={1}
                        max={14}
                        value={formData.semester}
                        onChange={(e) =>
                          setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })
                        }
                      />
                    )}
                  </FormField>
                ) : null}
                <FormField id="user-phone" label="No. HP" required>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  )}
                </FormField>
                {editingUser ? (
                  <div className="flex items-center gap-3 pt-6">
                    <Checkbox
                      checked={Boolean(formData.is_active)}
                      onCheckedChange={(checked) =>
                        setFormData((p) => ({ ...p, is_active: Boolean(checked) }))
                      }
                    />
                    <span className="text-sm font-medium text-muted-foreground">Akun Aktif</span>
                  </div>
                ) : null}

                {formData.role === 'USER' ? (
                  <>
                    {editingUser && enrolledClasses.length > 0 ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Kelas terdaftar saat ini</Label>
                        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-3">
                          {enrolledClasses.map((c) => (
                            <Badge key={c.id} variant="secondary">
                              {formatClassLabel(c)}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Untuk mengeluarkan atau pindah kelas, gunakan halaman Kelas.
                        </p>
                      </div>
                    ) : null}
                    <ClassMultiSelect
                      value={classIds}
                      onChange={setClassIds}
                      excludeClassIds={editingUser ? enrolledClasses.map((c) => c.id) : []}
                      hint={
                        editingUser
                          ? 'Pilih kelas tambahan (opsional). Kelas yang sudah terdaftar tidak ditampilkan di daftar.'
                          : 'Kosongkan jika belum masuk kelas. Untuk mengeluarkan atau pindah kelas, gunakan halaman Kelas.'
                      }
                    />
                  </>
                ) : null}
              </div>

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
                  type="submit"
                  disabled={saving}
                  isLoading={saving}
                  label={editingUser ? 'Simpan' : 'Tambah'}
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

        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Import Mahasiswa</DialogTitle>
              <DialogDescription>
                Unduh template Excel, isi data mahasiswa, lalu unggah kembali. Semua akun hasil
                import dari layar ini sementara akan disimpan dengan enrollment date 1 Agustus tahun
                ini. Isi kolom kelas dalam sheet yang sama dan pisahkan beberapa kelas dengan tanda
                |. Jika nama kelas belum ada, sistem akan membuatnya otomatis atas akun Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full justify-center"
              >
                <Download size={18} className="mr-2" />
                Unduh Template Excel
              </Button>

              <div className="h-px bg-slate-200 bg-muted" />

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload File Excel (.xlsx)</Label>
                  <Input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <SubmitButton
                    type="submit"
                    disabled={importing || !importFile}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    isLoading={importing}
                    label="Import Data"
                    loadingLabel="Memproses..."
                    icon={<Upload size={18} />}
                  />
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Device Confirmation Modal */}
        <ConfirmModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={confirmResetDevice}
          title="Konfirmasi Reset Perangkat"
          description="Apakah Anda yakin ingin mereset perangkat mahasiswa ini? Mereka akan diminta login ulang dan mengikat perangkat baru pada sesi absensi berikutnya."
          confirmText="Ya, Reset Perangkat"
          variant="warning"
          loading={resetting}
          loadingText="Mereset…"
        />

        {/* Delete User Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteUser}
          title="Konfirmasi Hapus Pengguna"
          description="Apakah Anda yakin ingin menghapus pengguna ini? Seluruh data yang terkait dengan pengguna ini akan dihapus secara permanen."
          confirmText="Ya, Hapus Pengguna"
          variant="danger"
          loading={deleting}
          loadingText="Menghapus…"
        />
      </AdminPageShell>
    </>
  );
}
