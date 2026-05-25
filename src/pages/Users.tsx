import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, Download, Upload, Smartphone, Users as UsersIcon } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { CardSkeletonList } from '@/components/admin/CardSkeleton';
import { userRoleLabel } from '@/lib/sessionStatusLabel';
import { toastErrorMessage } from '@/lib/toastMessage';
import * as ExcelJS from 'exceljs';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { ConfirmModal } from '@/components/ConfirmModal';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import { TablePagination } from '@/components/ui/TablePagination';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import type { User } from '@/types/user';
import type { PaginationMeta } from '@/types/common';
import { ClassMultiSelect, type ClassOption } from '@/components/ClassMultiSelect';
import { formatClassLabel } from '@/lib/classLabel';

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
  
  // Form state
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'USER', is_active: true, department: '', nim_nip: '', phone: '', semester: 1
  });
  const [facultiesData, setFacultiesData] = useState<{name: string, departments: string[]}[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassOption[]>([]);

  // Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<string | null>(null);

  const fetcher = (url: string) => api.get(url).then(res => res.data);
  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Loading state untuk aksi tulis
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    search: debouncedSearch.trim(),
    role: roleFilter,
    status: statusFilter
  });

  const swr = useSWR(`/users?${queryParams.toString()}`, fetcher, { revalidateOnFocus: false });
  const { isPending: loading, isError, showSlowLoadingHint, retry } = useSwrPageState(swr);
  const { data, mutate, isValidating } = swr;

  const users: User[] = Array.isArray(data?.data) ? data.data : [];
  const meta: PaginationMeta | null = data?.meta || null;

  const fetchFaculties = async () => {
    try {
      const res = await api.get('/settings/departments');
      if (res.data.data) {
        setFacultiesData(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const handleOpenModal = async (user: User | null = null) => {
    setClassIds([]);
    setEnrolledClasses([]);
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        nim_nip: user.nim_nip || '',
        department: user.department || '',
        phone: user.phone || '',
        semester: user.semester || 1,
        is_active: user.is_active
      });
      if (user.role === 'USER') {
        try {
          const res = await api.get(`/users/${user.id}/enrollments`);
          setEnrolledClasses(res.data.data ?? []);
        } catch {
          toast.error('Gagal memuat kelas mahasiswa');
        }
      }
    } else {
      setEditingUser(null);
      setFormData({
        name: '', email: '', password: '', role: 'USER', nim_nip: '', department: '', phone: '', semester: 1, is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        class_ids: formData.role === 'USER' ? classIds : [],
      };
      if (editingUser) {
        const res = await api.put(`/users/${editingUser.id}`, payload);
        const added = res.data?.data?.enrolled_added ?? 0;
        if (added > 0) {
          toast.success(`Pengguna diperbarui dan ditambahkan ke ${added} kelas`);
        } else {
          toast.success('Pengguna berhasil diperbarui');
        }
      } else {
        const res = await api.post('/users', payload);
        const enrolled = res.data?.data?.enrolled_classes ?? 0;
        if (enrolled > 0) {
          toast.success(`Pengguna ditambahkan dan didaftarkan ke ${enrolled} kelas`);
        } else {
          toast.success('Pengguna berhasil ditambahkan');
        }
      }
      setIsModalOpen(false);
      setClassIds([]);
      setEnrolledClasses([]);
      mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Terjadi kesalahan'));
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
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Mahasiswa');

    sheet.columns = [
      { header: 'Nama Lengkap', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'NIM_NIP', key: 'nim', width: 20 },
      { header: 'Departemen', key: 'dept', width: 25 },
      { header: 'No_HP', key: 'phone', width: 20 },
      { header: 'Role (USER/ADMIN/CONTENT_ADMIN)', key: 'role', width: 26 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    // Example row
    sheet.addRow({
      name: 'Budi Santoso',
      email: 'budi@mhs.kampus.ac.id',
      nim: '210010101',
      dept: 'Teknik Informatika',
      phone: '081234567890',
      role: 'USER',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
      const res = await api.post('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
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

  const actionOverlayLabel = saving
    ? (editingUser ? 'Menyimpan perubahan pengguna…' : 'Menambah pengguna…')
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
      icon={<UsersIcon className="h-5 w-5" />}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Cari nama, email, atau NIM/NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
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
              <SelectTrigger className="w-full md:w-[150px]">
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
                  <AdminEmptyState
                    compact
                    icon={UsersIcon}
                    hasFilters={hasFilters}
                  />
                </li>
              )
              : filteredUsers.map((user) => (
              <li key={user.id} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-bold text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.nim_nip || '—'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {typeof user.department === 'object' && user.department !== null
                    ? ((user.department as { name?: string; id?: string }).name || (user.department as { id?: string }).id)
                    : (user.department || '—')}
                  {user.role === 'USER' ? ` · Semester ${user.semester || 1}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge {...roleBadgeProps(user.role)}>{userRoleLabel(user.role)}</Badge>
                  <Badge variant={user.is_active ? 'success' : 'destructive'}>{user.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                  {user.device_fingerprint ? (
                    <Badge variant="success" className="gap-1.5">
                      <Smartphone size={12} aria-hidden="true" />
                      Terikat
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Bebas</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.device_fingerprint ? (
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
                  <Button type="button" size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => handleOpenModal(user)}>
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
            ))}
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
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <AdminEmptyState compact icon={UsersIcon} hasFilters={hasFilters} className="border-0 shadow-none" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-zinc-300">{user.nim_nip || '-'}</TableCell>
                    <TableCell>
                      <Badge {...roleBadgeProps(user.role)}>
                        {userRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground dark:text-zinc-300">
                        {typeof user.department === 'object' && user.department !== null ? ((user.department as any).name || (user.department as any).id) : (user.department || '-')}
                      </div>
                      {user.role === 'USER' ? <div className="mt-1 text-xs text-muted-foreground">Semester {user.semester || 1}</div> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'destructive'}>
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.device_fingerprint ? (
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
                        {user.device_fingerprint ? (
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
          <div className="border-b border-border px-6 py-4 border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </DialogTitle>
              <DialogDescription className="sr-only">Form pengguna</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>
                  Kata Sandi {editingUser ? <span className="text-xs font-normal text-slate-400">(Kosongkan jika tidak diubah)</span> : <span className="text-red-500">*</span>}
                </Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
              </div>
              <div className="space-y-2">
                <Label>Peran (Role) <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.role}
                  onValueChange={val => setFormData({...formData, role: val, semester: val === 'USER' ? 1 : 0})}
                  disabled={currentUser?.role !== 'SUPER_ADMIN'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User / Mahasiswa</SelectItem>
                    <SelectItem value="ADMIN">Admin / Dosen</SelectItem>
                    {currentUser?.role === 'SUPER_ADMIN' ? <SelectItem value="CONTENT_ADMIN">Admin Konten</SelectItem> : null}
                    {currentUser?.role === 'SUPER_ADMIN' ? <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NIM / NIP <span className="text-red-500">*</span></Label>
                <Input type="text" required value={formData.nim_nip} onChange={e => setFormData({ ...formData, nim_nip: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Departemen / Prodi <span className="text-red-500">*</span></Label>
                {facultiesData.length > 0 ? (
                  <Select required value={formData.department} onValueChange={val => setFormData({...formData, department: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Prodi" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultiesData.map(f => {
                        if (!f) return null;
                        return (
                          <SelectGroup key={f.name}>
                            <SelectLabel>{f.name}</SelectLabel>
                            {f.departments?.map(d => {
                              const deptName = typeof d === 'object' && d !== null ? ((d as any).name || (d as any).id) : d;
                              return <SelectItem key={deptName} value={deptName}>{deptName}</SelectItem>;
                            })}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input type="text" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="Masukkan Prodi" />
                )}
              </div>
              {formData.role === 'USER' ? (
                <div className="space-y-2">
                  <Label>Semester <span className="text-red-500">*</span></Label>
                  <Input type="number" required min={1} max={14} value={formData.semester} onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })} />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>No. HP <span className="text-red-500">*</span></Label>
                <Input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              {editingUser ? (
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox checked={Boolean(formData.is_active)} onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_active: Boolean(checked) }))} />
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
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? 'Menyimpan…' : editingUser ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Mahasiswa</DialogTitle>
            <DialogDescription>Unduh template Excel, isi data mahasiswa, lalu unggah kembali.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="w-full justify-center">
              <Download size={18} className="mr-2" />
              Unduh Template Excel
            </Button>

            <div className="h-px bg-slate-200 bg-muted" />

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Upload File Excel (.xlsx)</Label>
                <Input type="file" accept=".xlsx, .xls" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={importing || !importFile} className="bg-emerald-600 hover:bg-emerald-700">
                  {importing ? 'Memproses...' : (
                    <>
                      <Upload size={18} className="mr-2" /> Import Data
                    </>
                  )}
                </Button>
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
