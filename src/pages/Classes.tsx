import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClassItem {
  id: string;
  name: string;
  course_code: string | null;
  description: string | null;
  lecturer_id: string;
  lecturer: { name: string };
  _count: { enrollments: number, sessions: number };
}

interface User {
  id: string;
  name: string;
  nim_nip: string | null;
}

export default function Classes() {
  const { user: currentUser } = useAuthStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Form state
  const [formData, setFormData] = useState({
    name: '', course_code: '', description: '', lecturer_id: ''
  });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data);
    } catch (error) {
      toast.error('Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchClasses();
    fetchLecturers();
  }, []);

  const handleOpenModal = (cls: ClassItem | null = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        course_code: cls.course_code || '',
        description: cls.description || '',
        lecturer_id: cls.lecturer_id
      });
    } else {
      setEditingClass(null);
      setFormData({
        name: '', course_code: '', description: '', lecturer_id: currentUser?.role === 'ADMIN' ? currentUser.id : ''
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
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kelas ini? Semua data enrollment akan hilang.')) {
      try {
        await api.delete(`/classes/${id}`);
        toast.success('Kelas berhasil dihapus');
        fetchClasses();
      } catch (error) {
        toast.error('Gagal menghapus kelas');
      }
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
      fetchClasses();
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
      fetchClasses();
    } catch (error) {
      toast.error('Gagal mengeluarkan mahasiswa');
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.course_code && c.course_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Manajemen Kelas</h1>
        {currentUser?.role !== 'USER' && (
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Buat Kelas Baru
          </Button>
        )}
      </div>

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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
              <TableRow>
                <TableHead>Mata Kuliah / Kelas</TableHead>
                <TableHead>Dosen Pengampu</TableHead>
                <TableHead>Jumlah Mahasiswa</TableHead>
                <TableHead>Jumlah Sesi</TableHead>
                {currentUser?.role !== 'USER' && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    Memuat data kelas...
                  </TableCell>
                </TableRow>
              ) : filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    Tidak ada kelas ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        <BookOpen size={16} className="text-indigo-500" />
                        {c.name}
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
                    {currentUser?.role !== 'USER' && (
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
                              onClick={() => handleDelete(c.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
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
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nama Kelas / Mata Kuliah</Label>
                <Input 
                  type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: Pemrograman Web (A)"
                />
              </div>
              <div className="space-y-2">
                <Label>Kode MK (Opsional)</Label>
                <Input 
                  type="text" value={formData.course_code} onChange={e => setFormData({...formData, course_code: e.target.value})}
                  placeholder="PTI123"
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (Opsional)</Label>
                <Input 
                  type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Dosen Pengampu</Label>
                <Select 
                  value={formData.lecturer_id} onValueChange={val => setFormData({...formData, lecturer_id: val})}
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
              
              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-2xl flex flex-col border border-slate-200 dark:border-zinc-800 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Kelola Mahasiswa Kelas</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsEnrollModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 overflow-hidden">
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
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveStudent(student.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 px-2"
                            >
                              Keluarkan
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}