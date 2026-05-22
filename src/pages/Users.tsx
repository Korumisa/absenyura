import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, Download, Upload, Smartphone, Users as UsersIcon } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import type { User } from '@/types/user';
import type { PaginationMeta } from '@/types/common';

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

  // Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<string | null>(null);

  const fetcher = (url: string) => api.get(url).then(res => res.data);
  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    search: debouncedSearch.trim(),
    role: roleFilter,
    status: statusFilter
  });

  const { data, error, isLoading: loading, isValidating, mutate } = useSWR(`/users?${queryParams.toString()}`, fetcher, { revalidateOnFocus: false });

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

  const handleOpenModal = (user: User | null = null) => {
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
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('Pengguna berhasil diperbarui');
      } else {
        await api.post('/users', formData);
        toast.success('Pengguna berhasil ditambahkan');
      }
      setIsModalOpen(false);
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const openDeleteConfirm = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/users/${userToDelete}`);
      toast.success('Pengguna berhasil dihapus');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      mutate();
    } catch (error) {
      toast.error('Gagal menghapus pengguna');
    }
  };

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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengimpor data Excel');
    } finally {
      setImporting(false);
    }
  };

  const openResetConfirm = (id: string) => {
    setUserToReset(id);
    setIsResetModalOpen(true);
  };

  const confirmResetDevice = async () => {
    if (!userToReset) return;
    try {
      await api.post(`/users/${userToReset}/reset-device`);
      toast.success('Perangkat berhasil di-reset');
      setIsResetModalOpen(false);
      setUserToReset(null);
      mutate();
    } catch (error) {
      toast.error('Gagal mereset perangkat');
    }
  };

  return (
    <AdminPageShell
      title="Manajemen Pengguna"
      description="Kelola user, import Excel, dan reset perangkat."
      variant="plain"
      icon={<UsersIcon className="h-5 w-5" />}
      actions={
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <Upload size={18} className="mr-2" />
            Import Excel
          </Button>
          <Button type="button" onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <Plus size={18} className="mr-2" />
            Tambah Pengguna
          </Button>
        </div>
      }
    >
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row gap-3 items-center justify-between">
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

        <div className="p-4">
          <Table>
            <TableHeader>
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
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500 dark:text-zinc-400">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500 dark:text-zinc-400">
                    Tidak ada data pengguna ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-slate-500 dark:text-zinc-400">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-zinc-300">{user.nim_nip || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'SUPER_ADMIN'
                            ? 'default'
                            : user.role === 'ADMIN'
                              ? 'secondary'
                              : user.role === 'CONTENT_ADMIN'
                                ? 'warning'
                                : 'outline'
                        }
                        className={
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : user.role === 'ADMIN'
                              ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600'
                              : user.role === 'CONTENT_ADMIN'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : ''
                        }
                      >
                        {typeof user.role === 'object' && user.role !== null ? ((user.role as any).name || (user.role as any).id) : user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-600 dark:text-zinc-300">
                        {typeof user.department === 'object' && user.department !== null ? ((user.department as any).name || (user.department as any).id) : (user.department || '-')}
                      </div>
                      {user.role === 'USER' ? <div className="mt-1 text-xs text-slate-500">Semester {user.semester || 1}</div> : null}
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
                            Reset Device
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(user)}
                          className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-indigo-900/30"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </Button>
                        {currentUser?.role === 'SUPER_ADMIN' && currentUser?.id !== user.id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteConfirm(user.id)}
                            className="text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/30"
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

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50">
            <span className="text-sm text-slate-500 dark:text-zinc-400">
              Menampilkan {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} pengguna
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isValidating}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages || isValidating}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">
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
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Akun Aktif</span>
                </div>
              ) : null}
            </div>

            <DialogFooter className="mt-8 border-t border-slate-200 pt-4 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit">{editingUser ? 'Simpan' : 'Tambah'}</Button>
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

            <div className="h-px bg-slate-200 dark:bg-zinc-800" />

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
      />
    </AdminPageShell>
  );
}
