import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Building2, BookOpen, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MasterData() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'departments' | 'subjects'>('departments');

  // Department Settings
  const [faculties, setFaculties] = useState<{name: string, departments: string[]}[]>([]);
  const [newFaculty, setNewFaculty] = useState('');
  const [newDepartments, setNewDepartments] = useState<Record<number, string>>({});

  // Subject Settings
  const [subjects, setSubjects] = useState<{code: string, name: string}[]>([]);
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  const fetcher = (url: string) => api.get(url).then(res => res.data.data);

  const { data: serverFaculties } = useSWR(user?.role === 'SUPER_ADMIN' ? '/settings/departments' : null, fetcher, { revalidateOnFocus: false });
  const { data: serverSubjects } = useSWR(user?.role === 'SUPER_ADMIN' ? '/settings/subjects' : null, fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (serverFaculties) setFaculties(serverFaculties);
  }, [serverFaculties]);

  useEffect(() => {
    if (serverSubjects) setSubjects(serverSubjects);
  }, [serverSubjects]);

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

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Kelola Master Data</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-2 flex flex-col gap-1 shadow-sm">
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
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'departments' && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Manajemen Fakultas & Prodi</h2>
                  <p className="text-sm text-slate-500">Atur hierarki fakultas dan program studi untuk pengguna.</p>
                </div>
                <Button onClick={handleSaveDepartments}>Simpan Data</Button>
              </div>

              <div className="space-y-6">
                {faculties.map((faculty, index) => {
                  if (!faculty) return null;
                  return (
                  <div key={index} className="border border-slate-200 dark:border-zinc-700 rounded-xl p-4 bg-slate-50 dark:bg-zinc-900/50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        {typeof faculty.name === 'object' && faculty.name !== null ? ((faculty.name as any).name || (faculty.name as any).id) : faculty.name}
                      </h3>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                        setFaculties(faculties.filter((_, i) => i !== index));
                      }}>
                        Hapus Fakultas
                      </Button>
                    </div>

                    <div className="pl-6 space-y-3">
                      {faculty.departments?.map((dept, dIndex) => {
                        const deptName = typeof dept === 'object' && dept !== null ? ((dept as any).name || (dept as any).id) : dept;
                        return (
                        <div key={dIndex} className="flex justify-between items-center bg-white dark:bg-zinc-800 p-2 px-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-sm text-slate-700 dark:text-zinc-300">{deptName}</span>
                          <Button variant="ghost" size="icon" onClick={() => {
                            const newFacs = [...faculties];
                            newFacs[index].departments = newFacs[index].departments.filter((_, i) => i !== dIndex);
                            setFaculties(newFacs);
                          }} className="text-slate-400 hover:text-red-500 h-6 w-6">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )})}

                      <div className="flex gap-2 mt-2">
                        <Input 
                          size={1}
                          placeholder="Tambah Prodi Baru..." 
                          className="h-8 text-sm"
                          value={newDepartments[index] || ''}
                          onChange={e => setNewDepartments({...newDepartments, [index]: e.target.value})}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newDepartments[index]) {
                              e.preventDefault();
                              const newFacs = [...faculties];
                              newFacs[index].departments.push(newDepartments[index]);
                              setFaculties(newFacs);
                              setNewDepartments({...newDepartments, [index]: ''});
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            if (newDepartments[index]) {
                              const newFacs = [...faculties];
                              newFacs[index].departments.push(newDepartments[index]);
                              setFaculties(newFacs);
                              setNewDepartments({...newDepartments, [index]: ''});
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )})}

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-zinc-700">
                  <Input 
                    placeholder="Nama Fakultas Baru..." 
                    value={newFaculty}
                    onChange={e => setNewFaculty(e.target.value)}
                  />
                  <Button variant="outline" onClick={() => {
                    if (newFaculty) {
                      setFaculties([...faculties, { name: newFaculty, departments: [] }]);
                      setNewFaculty('');
                    }
                  }}>Tambah Fakultas</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
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
