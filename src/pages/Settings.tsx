import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import api from '@/services/api';
import { toast } from 'sonner';
import { User, LogOut, Building2, Plus, Trash2, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { user, setAuth, accessToken } = useAuthStore();
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'departments' | 'subjects'>('profile');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Department Settings
  const [faculties, setFaculties] = useState<{name: string, departments: string[]}[]>([]);
  const [newFaculty, setNewFaculty] = useState('');
  const [newDepartments, setNewDepartments] = useState<Record<number, string>>({});

  // Subject Settings
  const [subjects, setSubjects] = useState<{code: string, name: string}[]>([]);
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      api.get('/settings/departments').then(res => {
        if (res.data.data) setFaculties(res.data.data);
      }).catch(err => console.error('Failed to load departments', err));

      api.get('/settings/subjects').then(res => {
        if (res.data.data) setSubjects(res.data.data);
      }).catch(err => console.error('Failed to load subjects', err));
    }
  }, [user]);

  const handleSaveDepartments = async () => {
    try {
      await api.post('/settings/departments', { data: faculties });
      toast.success('Data Fakultas & Prodi berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan Fakultas & Prodi');
    }
  };

  const handleSaveSubjects = async () => {
    try {
      await api.post('/settings/subjects', { data: subjects });
      toast.success('Data Mata Kuliah berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan Mata Kuliah');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error('Kata sandi baru tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/settings/profile', {
        name: formData.name,
        phone: formData.phone,
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      
      // Update local state
      if (accessToken) {
        setAuth({ ...user!, name: formData.name }, accessToken);
      }
      
      toast.success(res.data.message || 'Profil berhasil diperbarui');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pengaturan</h1>
        <p className="text-slate-500 dark:text-zinc-400">Kelola profil, kata sandi, dan preferensi akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-1 space-y-2">
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('profile')}
              className={`w-full justify-start ${activeTab === 'profile' ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
            >
              <User className="w-5 h-5 mr-3" /> Profil & Keamanan
            </Button>
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('departments')}
                  className={`w-full justify-start ${activeTab === 'departments' ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                >
                  <Building2 className="w-5 h-5 mr-3" /> Fakultas & Prodi
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('subjects')}
                  className={`w-full justify-start ${activeTab === 'subjects' ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                >
                  <BookOpen className="w-5 h-5 mr-3" /> Mata Kuliah
                </Button>
              </>
            )}
          </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          
          {activeTab === 'profile' && (
            <>
              {/* Profile Form */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Informasi Profil</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input 
                  type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input 
                  type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" disabled value={user?.email || ''}
                />
                <p className="text-xs text-slate-500 mt-1">Email tidak dapat diubah. Hubungi Super Admin jika perlu bantuan.</p>
              </div>
              
              <hr className="my-6 border-slate-200 dark:border-zinc-700" />
              
              <h3 className="text-md font-bold text-slate-800 dark:text-white mb-2">Ubah Kata Sandi</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Kosongkan jika tidak ingin mengubah kata sandi.</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kata Sandi Saat Ini</Label>
                  <Input 
                    type="password" value={formData.current_password} onChange={e => setFormData({...formData, current_password: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kata Sandi Baru</Label>
                    <Input 
                      type="password" value={formData.new_password} onChange={e => setFormData({...formData, new_password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Konfirmasi Kata Sandi</Label>
                    <Input 
                      type="password" value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm p-6 mt-6">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2">Manajemen Perangkat</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Logout paksa dari perangkat ini (akan menghapus sesi token).</p>
            <button 
              onClick={() => {
                localStorage.removeItem('device_fingerprint');
                toast.success('Perangkat dilupakan. Anda akan diminta login kembali pada percobaan berikutnya.');
              }}
              className="px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <LogOut size={16} /> Lupakan Perangkat Ini
            </button>
          </div>
          </>
        )}

        {activeTab === 'departments' && user?.role === 'SUPER_ADMIN' && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Manajemen Fakultas & Prodi</h2>
                <p className="text-sm text-slate-500">Daftar ini akan muncul sebagai pilihan saat Admin menambahkan user baru.</p>
              </div>
              <Button onClick={handleSaveDepartments}>Simpan Data</Button>
            </div>

            <div className="space-y-6">
              {faculties.map((faculty, fIndex) => (
                <div key={fIndex} className="p-4 border border-slate-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white">{faculty.name}</h3>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setFaculties(faculties.filter((_, i) => i !== fIndex))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {faculty.departments.map((dept, dIndex) => (
                      <div key={dIndex} className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-full text-sm">
                        <span>{dept}</span>
                        <button onClick={() => {
                          const newF = [...faculties];
                          newF[fIndex].departments = newF[fIndex].departments.filter((_, i) => i !== dIndex);
                          setFaculties(newF);
                        }} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Tambah Prodi Baru..." 
                      value={newDepartments[fIndex] || ''}
                      onChange={e => setNewDepartments({...newDepartments, [fIndex]: e.target.value})}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newDepartments[fIndex]) return;
                          const newF = [...faculties];
                          if (!newF[fIndex].departments.includes(newDepartments[fIndex])) {
                            newF[fIndex].departments.push(newDepartments[fIndex]);
                            setFaculties(newF);
                            setNewDepartments({...newDepartments, [fIndex]: ''});
                          }
                        }
                      }}
                    />
                    <Button variant="secondary" onClick={() => {
                      if (!newDepartments[fIndex]) return;
                      const newF = [...faculties];
                      if (!newF[fIndex].departments.includes(newDepartments[fIndex])) {
                        newF[fIndex].departments.push(newDepartments[fIndex]);
                        setFaculties(newF);
                        setNewDepartments({...newDepartments, [fIndex]: ''});
                      }
                    }}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-zinc-700">
                <Input 
                  placeholder="Nama Fakultas Baru..." 
                  value={newFaculty}
                  onChange={e => setNewFaculty(e.target.value)}
                />
                <Button variant="outline" onClick={() => {
                  if (newFaculty && !faculties.some(f => f.name === newFaculty)) {
                    setFaculties([...faculties, { name: newFaculty, departments: [] }]);
                    setNewFaculty('');
                  }
                }}>Tambah Fakultas</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && user?.role === 'SUPER_ADMIN' && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Manajemen Mata Kuliah</h2>
                <p className="text-sm text-slate-500">Daftar ini akan muncul sebagai pilihan saat Admin menambahkan kelas baru.</p>
              </div>
              <Button onClick={handleSaveSubjects}>Simpan Data</Button>
            </div>

            <div className="space-y-4">
              {subjects.map((subject, index) => (
                <div key={index} className="flex justify-between items-center p-3 border border-slate-200 dark:border-zinc-700 rounded-lg">
                  <div>
                    <span className="font-semibold font-mono text-sm text-indigo-600 dark:text-indigo-400 mr-2">{subject.code}</span>
                    <span className="text-slate-800 dark:text-white">{subject.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setSubjects(subjects.filter((_, i) => i !== index))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-zinc-700">
                <Input 
                  placeholder="Kode MK (Maks 10 char)" 
                  className="w-1/3"
                  maxLength={10}
                  value={newSubjectCode}
                  onChange={e => setNewSubjectCode(e.target.value.toUpperCase())}
                />
                <Input 
                  placeholder="Nama Mata Kuliah Baru..." 
                  className="w-2/3"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                />
                <Button variant="outline" onClick={() => {
                  if (newSubjectName && newSubjectCode && !subjects.some(s => s.code === newSubjectCode)) {
                    setSubjects([...subjects, { code: newSubjectCode, name: newSubjectName }]);
                    setNewSubjectCode('');
                    setNewSubjectName('');
                  }
                }}>Tambah</Button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}