import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { ArrowLeft, Smartphone, User } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import AdminPageShell from '@/components/AdminPageShell';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User as AppUser } from '@/types/user';
import { formatClassLabel } from '@/lib/classLabel';
import { toastErrorMessage } from '@/lib/toastMessage';

type EnrollmentRow = { id: string; name: string; semester: number };

type ProfileForm = {
  name: string;
  email: string;
  nim_nip: string;
  phone: string;
  department: string;
  semester: number;
  is_active: boolean;
};

export default function StudentDetail() {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const backTo =
    (location.state as { from?: string } | null)?.from ||
    ((location.state as { classId?: string } | null)?.classId
      ? `/classes/${(location.state as { classId: string }).classId}`
      : '/classes');

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    email: '',
    nim_nip: '',
    phone: '',
    department: '',
    semester: 1,
    is_active: true,
  });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [facultiesData, setFacultiesData] = useState<{ name: string; departments: string[] }[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [resettingDevice, setResettingDevice] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isResetDeviceOpen, setIsResetDeviceOpen] = useState(false);

  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);

  const profileSwr = useSWR<AppUser>(studentId ? `/users/${studentId}` : null, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: profile, isInitialLoading, isError, retry, error, mutate } = useSwrPageState(profileSwr);

  const enrollSwr = useSWR<EnrollmentRow[]>(
    studentId && profile?.role === 'USER' ? `/users/${studentId}/enrollments` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: enrollments = [], isInitialLoading: loadingClasses } = useSwrPageState(enrollSwr);

  useEffect(() => {
    void api.get('/settings/departments').then((res) => {
      if (res.data.data) setFacultiesData(res.data.data);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '',
      email: profile.email ?? '',
      nim_nip: profile.nim_nip ?? '',
      phone: profile.phone ?? '',
      department: profile.department ?? '',
      semester: profile.semester ?? 1,
      is_active: profile.is_active ?? true,
    });
  }, [profile]);

  const saveProfile = async () => {
    if (!studentId || saving) return;
    setSaving(true);
    try {
      await api.put(`/users/${studentId}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        nim_nip: form.nim_nip.trim(),
        phone: form.phone.trim(),
        department: form.department.trim(),
        semester: form.semester,
        is_active: form.is_active,
      });
      toast.success('Data mahasiswa berhasil disimpan');
      setIsSaveConfirmOpen(false);
      await mutate();
    } catch (err: unknown) {
      toast.error(toastErrorMessage(err, 'Gagal menyimpan data'));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!studentId || savingPassword) return;
    if (password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return;
    }
    if (password !== passwordConfirm) {
      toast.error('Konfirmasi kata sandi tidak cocok');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put(`/users/${studentId}`, { password });
      toast.success('Kata sandi berhasil diperbarui');
      setPassword('');
      setPasswordConfirm('');
      setIsPasswordConfirmOpen(false);
    } catch (err: unknown) {
      toast.error(toastErrorMessage(err, 'Gagal memperbarui kata sandi'));
    } finally {
      setSavingPassword(false);
    }
  };

  const resetDevice = async () => {
    if (!studentId || resettingDevice) return;
    setResettingDevice(true);
    try {
      await api.post(`/users/${studentId}/reset-device`);
      toast.success('Perangkat berhasil di-reset. Mahasiswa dapat login di perangkat baru.');
      setIsResetDeviceOpen(false);
      await mutate();
    } catch (err: unknown) {
      toast.error(toastErrorMessage(err, 'Gagal reset perangkat'));
    } finally {
      setResettingDevice(false);
    }
  };

  const actionLabel = saving
    ? 'Menyimpan data…'
    : savingPassword
      ? 'Memperbarui kata sandi…'
      : resettingDevice
        ? 'Mereset perangkat…'
        : null;

  if (!studentId) {
    return (
      <AdminPageShell title="Mahasiswa tidak ditemukan" variant="plain">
        <Button variant="outline" onClick={() => navigate('/classes')}>
          Kembali
        </Button>
      </AdminPageShell>
    );
  }

  if (isError && !profile) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <AdminPageShell title="Biodata Mahasiswa" variant="plain">
        <ErrorWithRetry
          title={status === 403 ? 'Anda tidak memiliki akses' : 'Gagal memuat data mahasiswa'}
          error={profileSwr.error}
          onRetry={retry}
        />
        <Button variant="outline" className="mt-4" onClick={() => navigate(backTo)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </AdminPageShell>
    );
  }

  const enrolledDate = profile?.enrollment_date
    ? new Date(profile.enrollment_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <>
      <ActionLoadingOverlay show={!!actionLabel} label={actionLabel ?? ''} />
      <AdminPageShell
        title="Biodata Mahasiswa"
        description="Perbarui data akun mahasiswa langsung dari halaman ini."
        variant="plain"
        icon={<User className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => navigate(backTo)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Ringkasan</h2>
              <div className="mt-4 grid h-20 w-20 place-items-center rounded-full bg-brand/15 text-2xl font-bold text-brand">
                {isInitialLoading ? (
                  <Skeleton className="h-20 w-20 rounded-full" />
                ) : (
                  String(form.name || '?')
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </div>
              {isInitialLoading ? (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <p className="mt-4 text-lg font-bold text-foreground">{form.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{form.nim_nip || 'Tanpa NIM'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={form.is_active ? 'secondary' : 'outline'}>
                      {form.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    {profile?.device_fingerprint ? (
                      <Badge variant="outline" className="gap-1">
                        <Smartphone className="h-3 w-3" />
                        Perangkat terikat
                      </Badge>
                    ) : (
                      <Badge variant="outline">Perangkat bebas</Badge>
                    )}
                  </div>
                  {enrolledDate ? (
                    <p className="mt-4 text-xs text-muted-foreground">Terdaftar sejak {enrolledDate}</p>
                  ) : null}
                </>
              )}
            </section>

            {profile?.device_fingerprint ? (
              <section className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
                <p className="text-sm font-medium text-foreground">Reset perangkat absensi</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lepas ikatan perangkat agar mahasiswa bisa login di HP baru.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-orange-300 text-orange-700"
                  onClick={() => setIsResetDeviceOpen(true)}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Reset perangkat
                </Button>
              </section>
            ) : null}
          </aside>

          <div className="space-y-6">
            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-foreground">Informasi akun</h2>
                <Button type="button" size="sm" disabled={isInitialLoading} onClick={() => setIsSaveConfirmOpen(true)}>
                  Simpan perubahan
                </Button>
              </div>

              {isInitialLoading ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      Nama lengkap <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      NIM <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      required
                      value={form.nim_nip}
                      onChange={(e) => setForm((p) => ({ ...p, nim_nip: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Semester <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={14}
                      required
                      value={form.semester}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          semester: Math.max(1, Math.min(14, Number.parseInt(e.target.value || '1', 10) || 1)),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      No. HP <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Program / Prodi <span className="text-destructive">*</span>
                    </Label>
                    {facultiesData.length > 0 ? (
                      <Select
                        value={form.department || undefined}
                        onValueChange={(val) => setForm((p) => ({ ...p, department: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih prodi" />
                        </SelectTrigger>
                        <SelectContent>
                          {facultiesData.map((f) => (
                            <SelectGroup key={f.name}>
                              <SelectLabel>{f.name}</SelectLabel>
                              {f.departments?.map((d) => {
                                const deptName =
                                  typeof d === 'object' && d !== null
                                    ? ((d as { name?: string }).name ?? String(d))
                                    : String(d);
                                return (
                                  <SelectItem key={deptName} value={deptName}>
                                    {deptName}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        required
                        value={form.department}
                        onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                        placeholder="Nama prodi"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <Checkbox
                      id="student-active"
                      checked={form.is_active}
                      onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: Boolean(checked) }))}
                    />
                    <Label htmlFor="student-active" className="cursor-pointer font-normal">
                      Akun aktif (mahasiswa dapat login &amp; absen)
                    </Label>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Kata sandi</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Kosongkan jika tidak ingin mengubah.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!password}
                  onClick={() => setIsPasswordConfirmOpen(true)}
                >
                  Perbarui password
                </Button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Password baru</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Konfirmasi password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                Kelas terdaftar
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Untuk menambah atau mengeluarkan kelas, buka halaman Kelas Kuliah.
              </p>
              {loadingClasses ? (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : enrollments.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Belum terdaftar di kelas manapun.</p>
              ) : (
                <ul className="mt-4 divide-y divide-border rounded-md border border-border">
                  {enrollments.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/classes/${c.id}`}
                        className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-muted/50"
                      >
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="text-muted-foreground">{formatClassLabel(c)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </AdminPageShell>

      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={() => void saveProfile()}
        title="Simpan perubahan biodata?"
        description={`Data ${form.name || 'mahasiswa'} akan diperbarui di sistem.`}
        confirmText="Ya, Simpan"
        variant="primary"
        loading={saving}
        loadingText="Menyimpan…"
      />

      <ConfirmModal
        isOpen={isPasswordConfirmOpen}
        onClose={() => setIsPasswordConfirmOpen(false)}
        onConfirm={() => void savePassword()}
        title="Perbarui kata sandi?"
        description="Mahasiswa harus login ulang dengan kata sandi baru."
        confirmText="Ya, Perbarui"
        variant="primary"
        loading={savingPassword}
        loadingText="Memperbarui…"
      />

      <ConfirmModal
        isOpen={isResetDeviceOpen}
        onClose={() => setIsResetDeviceOpen(false)}
        onConfirm={() => void resetDevice()}
        title="Reset perangkat mahasiswa?"
        description="Ikatan perangkat absensi akan dihapus. Mahasiswa bisa mendaftarkan perangkat baru saat login."
        confirmText="Ya, Reset"
        variant="danger"
        loading={resettingDevice}
        loadingText="Mereset…"
      />
    </>
  );
}
