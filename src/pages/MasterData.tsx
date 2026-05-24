import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { toastErrorMessage } from '@/lib/toastMessage';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { Building2, BookOpen, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { cn } from '@/lib/utils';

export default function MasterData() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'departments' | 'subjects'>('departments');

  const [faculties, setFaculties] = useState<{ name: string; departments: string[] }[]>([]);
  const [newFaculty, setNewFaculty] = useState('');
  const [newDepartments, setNewDepartments] = useState<Record<number, string>>({});

  const [subjects, setSubjects] = useState<{ code: string; name: string }[]>([]);
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

  const facultiesSwr = useSWR(
    user?.role === 'SUPER_ADMIN' ? '/settings/departments' : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const subjectsSwr = useSWR(
    user?.role === 'SUPER_ADMIN' ? '/settings/subjects' : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const facultiesState = useSwrPageState(facultiesSwr);
  const subjectsState = useSwrPageState(subjectsSwr);
  const { data: serverFaculties } = facultiesSwr;
  const { data: serverSubjects } = subjectsSwr;
  const isLoadError = facultiesState.isError || subjectsState.isError;
  const loadError = facultiesSwr.error ?? subjectsSwr.error;
  const retryLoad = () => {
    facultiesState.retry();
    subjectsState.retry();
  };

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
    } catch (err) {
      toast.error(toastErrorMessage(err, 'Gagal menyimpan Fakultas & Prodi'));
    }
  };

  const handleSaveSubjects = async () => {
    try {
      await api.post('/settings/subjects', { data: subjects });
      toast.success('Data Mata Kuliah berhasil disimpan');
    } catch (err) {
      toast.error(toastErrorMessage(err, 'Gagal menyimpan Mata Kuliah'));
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <AdminPageShell title="Master Data" description="Halaman ini hanya untuk Super Admin." variant="plain">
        <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Anda tidak memiliki akses ke halaman ini.
        </p>
      </AdminPageShell>
    );
  }

  const tabBtn = (id: typeof activeTab, label: string, Icon: typeof Building2) => (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setActiveTab(id)}
      className={cn(
        'w-full justify-start min-h-11',
        activeTab === id
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 text-brand'
          : 'text-muted-foreground dark:text-slate-400',
      )}
    >
      <Icon className="mr-3 h-5 w-5" />
      {label}
    </Button>
  );

  return (
    <AdminPageShell
      title="Fakultas, Prodi & Mata Kuliah"
      description="Kelola hierarki fakultas/program studi dan daftar mata kuliah untuk sesi absensi."
      variant="plain"
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="flex flex-row gap-1 rounded-xl border border-border bg-card p-2 shadow-card lg:flex-col">
            {tabBtn('departments', 'Fakultas & Prodi', Building2)}
            {tabBtn('subjects', 'Mata Kuliah', BookOpen)}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {isLoadError ? (
            <ErrorWithRetry title="Gagal memuat master data" error={loadError} onRetry={retryLoad} />
          ) : activeTab === 'departments' ? (
            <AdminCard
              title="Manajemen Fakultas & Prodi"
              description="Atur hierarki fakultas dan program studi untuk profil pengguna."
              actions={
                <Button type="button" className="min-h-11" onClick={handleSaveDepartments}>
                  Simpan data
                </Button>
              }
            >
              <div className="space-y-4">
                {faculties.length === 0 ? (
                  <AdminEmptyState
                    icon={Building2}
                    title="Belum ada data"
                    description="Tambahkan fakultas dan program studi untuk digunakan di profil pengguna."
                  />
                ) : null}
                {faculties.map((faculty, index) => {
                  if (!faculty) return null;
                  const facultyName =
                    typeof faculty.name === 'object' && faculty.name !== null
                      ? ((faculty.name as { name?: string; id?: string }).name ||
                          (faculty.name as { id?: string }).id)
                      : faculty.name;

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 font-bold text-foreground">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                          {facultyName}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => setFaculties(faculties.filter((_, i) => i !== index))}
                        >
                          Hapus fakultas
                        </Button>
                      </div>

                      <div className="space-y-2 border-l-2 border-indigo-200 pl-4 dark:border-indigo-900">
                        {faculty.departments?.map((dept, dIndex) => {
                          const deptName =
                            typeof dept === 'object' && dept !== null
                              ? ((dept as { name?: string; id?: string }).name ||
                                  (dept as { id?: string }).id)
                              : dept;
                          return (
                            <div
                              key={dIndex}
                              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                            >
                              <span className="text-sm text-foreground">{deptName}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                onClick={() => {
                                  const newFacs = [...faculties];
                                  newFacs[index].departments = newFacs[index].departments.filter(
                                    (_, i) => i !== dIndex,
                                  );
                                  setFaculties(newFacs);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}

                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="Nama prodi baru…"
                            className="h-9 text-sm"
                            value={newDepartments[index] || ''}
                            onChange={(e) =>
                              setNewDepartments({ ...newDepartments, [index]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newDepartments[index]) {
                                e.preventDefault();
                                const newFacs = [...faculties];
                                newFacs[index].departments.push(newDepartments[index]);
                                setFaculties(newFacs);
                                setNewDepartments({ ...newDepartments, [index]: '' });
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (newDepartments[index]) {
                                const newFacs = [...faculties];
                                newFacs[index].departments.push(newDepartments[index]);
                                setFaculties(newFacs);
                                setNewDepartments({ ...newDepartments, [index]: '' });
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Nama fakultas baru…"
                    value={newFaculty}
                    onChange={(e) => setNewFaculty(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      if (newFaculty) {
                        setFaculties([...faculties, { name: newFaculty, departments: [] }]);
                        setNewFaculty('');
                      }
                    }}
                  >
                    Tambah fakultas
                  </Button>
                </div>
              </div>
            </AdminCard>
          ) : (
            <AdminCard
              title="Manajemen Mata Kuliah"
              description="Daftar ini muncul saat admin membuat sesi kehadiran baru."
              actions={
                <Button type="button" className="min-h-11" onClick={handleSaveSubjects}>
                  Simpan data
                </Button>
              }
            >
              <div className="space-y-3">
                {subjects.length === 0 ? (
                  <AdminEmptyState
                    icon={BookOpen}
                    title="Belum ada data"
                    description="Tambahkan mata kuliah agar tersedia saat membuat sesi kehadiran."
                  />
                ) : null}
                {subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border p-3 border-border"
                  >
                    <div>
                      <span className="mr-2 font-mono text-sm font-semibold text-brand text-brand">
                        {subject.code}
                      </span>
                      <span className="text-foreground">{subject.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => setSubjects(subjects.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Kode MK"
                    className="sm:w-32"
                    maxLength={10}
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                  />
                  <Input
                    placeholder="Nama mata kuliah…"
                    className="flex-1"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      if (
                        newSubjectName &&
                        newSubjectCode &&
                        !subjects.some((s) => s.code === newSubjectCode)
                      ) {
                        setSubjects([...subjects, { code: newSubjectCode, name: newSubjectName }]);
                        setNewSubjectCode('');
                        setNewSubjectName('');
                      }
                    }}
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </AdminCard>
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
