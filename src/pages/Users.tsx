import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, Download, Upload, Smartphone } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  nim_nip: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  semester?: number;
  enrollment_date?: string;
  device_fingerprint?: string | null;
}

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'USER', is_active: true, department: '', nim_nip: '', phone: ''
  });
  const [facultiesData, setFacultiesData] = useState<{name: string, departments: string[]}[]>([]);

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);
  const { data: users = [], error, isLoading: loading, mutate } = useSWR<User[]>('/users', fetcher, { revalidateOnFocus: false });

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
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '', email: '', password: '', role: 'USER', nim_nip: '', department: '', phone: '', is_active: true
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      try {
        await api.delete(`/users/${id}`);
        toast.success('Pengguna berhasil dihapus');
        mutate();
      } catch (error) {
        toast.error('Gagal menghapus pengguna');
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.nim_nip && u.nim_nip.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'ACTIVE' && u.is_active) || 
                          (statusFilter === 'INACTIVE' && !u.is_active);
                          
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Mahasiswa');

    sheet.columns = [
      { header: 'Nama Lengkap', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'NIM_NIP', key: 'nim', width: 20 },
      { header: 'Departemen', key: 'dept', width: 25 },
      { header: 'No_HP', key: 'phone', width: 20 },
      { header: 'Role (USER/ADMIN)', key: 'role', width: 20 },
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

  const handleResetDevice = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin mereset perangkat mahasiswa ini? Mereka akan diminta login ulang di perangkat baru.')) return;
    try {
      await api.post(`/users/${id}/reset-device`);
      toast.success('Perangkat berhasil di-reset');
      mutate();
    } catch (error) {
      toast.error('Gagal mereset perangkat');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen Pengguna</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
            >
              <Upload size={18} />
              <span>Import Excel</span>
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
            >
              <Plus size={18} />
              <span>Tambah Pengguna</span>
            </button>
          </div>
        </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari nama, email, atau NIM/NIP..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 text-sm border-b border-slate-200 dark:border-zinc-700">
                <th className="px-6 py-4 font-medium">Nama & Email</th>
                <th className="px-6 py-4 font-medium">NIM/NIP</th>
                <th className="px-6 py-4 font-medium">Peran</th>
                <th className="px-6 py-4 font-medium">Departemen / Smt</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Perangkat</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-zinc-400">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-zinc-400">
                    Tidak ada data pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-slate-500 dark:text-zinc-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-zinc-300">{user.nim_nip || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium
                        ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 
                          user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 dark:text-zinc-300">{user.department || '-'}</div>
                      {user.role === 'USER' && (
                        <div className="text-xs text-slate-500 mt-1">Semester {user.semester || 1}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium
                        ${user.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                      >
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.device_fingerprint ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                          <Smartphone size={12} />
                          Terikat
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 text-xs rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          Bebas
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.device_fingerprint && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetDevice(user.id)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 dark:text-orange-500 dark:hover:bg-orange-900/30 dark:border-orange-900"
                            title="Reset Perangkat (Mahasiswa akan diminta login ulang di perangkat baru)"
                          >
                            <Smartphone size={14} className="mr-1.5" />
                            Reset Device
                          </Button>
                        )}
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(user)}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </Button>
                        {currentUser?.role === 'SUPER_ADMIN' && currentUser?.id !== user.id && (
                          <Button 
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                  <Input 
                    type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Kata Sandi {editingUser ? <span className="text-xs text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span> : <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peran (Role) <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.role} onValueChange={val => setFormData({...formData, role: val})}
                    disabled={currentUser?.role !== 'SUPER_ADMIN'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Peran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User / Mahasiswa</SelectItem>
                      <SelectItem value="ADMIN">Admin / Dosen</SelectItem>
                      {currentUser?.role === 'SUPER_ADMIN' && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>NIM / NIP <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    required
                    value={formData.nim_nip}
                    onChange={e => setFormData({ ...formData, nim_nip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departemen / Prodi <span className="text-red-500">*</span></Label>
                  {facultiesData.length > 0 ? (
                    <Select required value={formData.department} onValueChange={val => setFormData({...formData, department: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Prodi" />
                      </SelectTrigger>
                      <SelectContent>
                        {facultiesData.map(f => (
                          <optgroup key={f.name} label={f.name} className="p-2 font-semibold text-slate-500">
                            {f.departments.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </optgroup>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      type="text" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                      placeholder="Masukkan Prodi"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>No. HP <span className="text-red-500">*</span></Label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                {editingUser && (
                  <div className="flex items-center h-full pt-6">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-700 dark:border-zinc-600"
                      />
                      <span className="ml-2 text-sm font-medium text-slate-700 dark:text-zinc-300">Akun Aktif</span>
                    </label>
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingUser ? 'Simpan' : 'Tambah'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Import Mahasiswa</h2>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">
                Unduh template Excel terlebih dahulu, isi data mahasiswa, lalu unggah kembali ke sistem.
              </p>
              
              <button 
                onClick={handleDownloadTemplate}
                className="w-full mb-6 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Unduh Template Excel
              </button>

              <hr className="border-slate-200 dark:border-zinc-700 mb-6" />

              <form onSubmit={handleImportSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2 text-left">Upload File Excel (.xlsx)</label>
                  <Input 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={importing || !importFile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {importing ? 'Memproses...' : <><Upload size={18} className="mr-2" /> Import Data</>}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}