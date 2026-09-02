import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/theme-provider';
import { Moon, Sun } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { User, LogOut, Shield, Mail, Phone } from 'lucide-react';
import { userRoleLabel } from '@/lib/utils/statusLabel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/form-field';
import AdminPageShell from '@/components/AdminPageShell';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { forgetDeviceFingerprint } from '@/lib/storage/deviceFingerprint';
import { useMutationToast } from '@/hooks/useMutationToast';
import { cn } from '@/lib/utils/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const settingsCardClass =
  'rounded-xl border border-border bg-card text-card-foreground shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10';

type ProfileField =
  | 'name'
  | 'email'
  | 'phone'
  | 'current_password'
  | 'new_password'
  | 'confirm_password';
type FieldErrors = Partial<Record<ProfileField, string>>;

function parseFieldErrors(err: unknown): FieldErrors {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status !== 422) return {};
  const raw = (err as { response?: { data?: { errors?: Record<string, string | string[]> } } })
    ?.response?.data?.errors;
  if (!raw || typeof raw !== 'object') return {};
  const out: FieldErrors = {};
  for (const [key, val] of Object.entries(raw)) {
    const msg = Array.isArray(val) ? val[0] : typeof val === 'string' ? val : undefined;
    if (msg) out[key as ProfileField] = msg;
  }
  return out;
}

export default function Settings() {
  const { user, setAuth } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeTab, setActiveTab] = useState<'profile'>('profile');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const res = await api.get('/settings/profile');
        const row = res.data.data;
        if (row) {
          setFormData({
            name: row.name || user.name || '',
            email: row.email || user.email || '',
            phone: row.phone || '',
            current_password: '',
            new_password: '',
            confirm_password: '',
          });
        }
      } catch (err) {
        setProfileError(err);
        setFormData((prev) => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
        }));
        toast.error(toastErrorMessage(err, 'Gagal memuat profil'));
      } finally {
        setProfileLoading(false);
      }
    };

    void loadProfile();
  }, [user]);

  const isStudent = user?.role === 'USER';

  const doSaveProfile = useMutationToast(
    async () => {
      return api.put('/settings/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
    },
    {
      successMsg: (res) => res.data.message || 'Profil berhasil diperbarui',
      errorMsg: (err) => {
        const fields = parseFieldErrors(err);
        if (Object.keys(fields).length > 0) setFieldErrors(fields);
        return toastErrorMessage(err, 'Gagal memperbarui profil');
      },
    }
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error('Kata sandi baru tidak cocok');
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const result = await doSaveProfile();
      if (result !== undefined) {
        setAuth({ ...user!, name: formData.name, email: formData.email });
        setFormData((prev) => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: '',
        }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell
      title="Pengaturan"
      description="Kelola profil, kata sandi, dan preferensi akun Anda."
      variant="plain"
      icon={<User className="size-5" />}
    >
      <div className="grid w-full gap-6 xl:grid-cols-12 xl:items-start">
        {activeTab === 'profile' && profileError ? (
          <div className="xl:col-span-12">
            <ErrorWithRetry
              title="Gagal memuat profil"
              error={profileError}
              onRetry={() => {
                setProfileError(null);
                void (async () => {
                  if (!user) return;
                  setProfileLoading(true);
                  try {
                    const res = await api.get('/settings/profile');
                    const row = res.data.data;
                    if (row) {
                      setFormData({
                        name: row.name || user.name || '',
                        email: row.email || user.email || '',
                        phone: row.phone || '',
                        current_password: '',
                        new_password: '',
                        confirm_password: '',
                      });
                    }
                  } catch (err) {
                    setProfileError(err);
                    toast.error(toastErrorMessage(err, 'Gagal memuat profil'));
                  } finally {
                    setProfileLoading(false);
                  }
                })();
              }}
            />
          </div>
        ) : (
          activeTab === 'profile' && (
            <>
              <aside className="space-y-6 xl:col-span-4 2xl:col-span-3">
                <Card className={settingsCardClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Tampilan</CardTitle>
                    <CardDescription>
                      Pilih tema yang nyaman untuk mata saat Anda mengelola absensi di malam hari
                      atau siang hari.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 gap-2"
                      onClick={toggleTheme}
                      aria-pressed={theme === 'dark'}
                    >
                      {theme === 'dark' ? (
                        <Sun className="size-4" aria-hidden="true" />
                      ) : (
                        <Moon className="size-4" aria-hidden="true" />
                      )}
                      {theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
                    </Button>
                  </CardContent>
                </Card>

                <Card className={settingsCardClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Ringkasan Akun</CardTitle>
                    <CardDescription>Data login Anda di sistem absensi.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
                      <Shield className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Peran</p>
                        <Badge variant="secondary" className="mt-1">
                          {user ? userRoleLabel(user.role) : '—'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <User
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Nama</p>
                        <p className="font-medium text-foreground">{formData.name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Mail
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 break-all">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground">{formData.email || '—'}</p>
                      </div>
                    </div>
                    {formData.phone ? (
                      <div className="flex items-start gap-3 text-sm">
                        <Phone
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-xs text-muted-foreground">No. HP</p>
                          <p className="font-medium text-foreground">{formData.phone}</p>
                        </div>
                      </div>
                    ) : null}
                    {isStudent ? (
                      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                        Perangkat absensi terikat saat login pertama. Hubungi admin jika perlu reset
                        perangkat.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {!isStudent ? (
                  <Card className={cn(settingsCardClass, 'border-red-200 dark:border-red-900/50')}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-600 dark:text-red-400">
                        Manajemen Perangkat
                      </CardTitle>
                      <CardDescription>
                        Hapus penautan perangkat ini; login berikutnya akan meminta verifikasi
                        ulang.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          forgetDeviceFingerprint();
                          toast.success(
                            'Perangkat dilupakan. Anda akan diminta login kembali pada percobaan berikutnya.'
                          );
                        }}
                        className="min-h-11 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto"
                      >
                        <LogOut size={16} className="mr-2" aria-hidden="true" /> Lupakan Perangkat
                        Ini
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}
              </aside>

              <Card className={cn(settingsCardClass, 'xl:col-span-8 2xl:col-span-9')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Informasi Profil</CardTitle>
                  <CardDescription>
                    Perbarui nama, kontak, dan kata sandi akun Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {profileLoading ? (
                      <div className="space-y-4" aria-busy="true" aria-label="Memuat profil">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            id="profile-name"
                            label="Nama Lengkap"
                            required
                            error={fieldErrors.name}
                            className="sm:col-span-2"
                          >
                            {({
                              id,
                              'aria-describedby': ariaDescribedBy,
                              'aria-invalid': ariaInvalid,
                            }) => (
                              <Input
                                id={id}
                                type="text"
                                required
                                autoComplete="name"
                                value={formData.name}
                                onChange={(e) => {
                                  setFormData({ ...formData, name: e.target.value });
                                  if (fieldErrors.name)
                                    setFieldErrors((f) => ({ ...f, name: undefined }));
                                }}
                                className={cn(fieldErrors.name && 'border-red-500')}
                                aria-describedby={ariaDescribedBy}
                                aria-invalid={ariaInvalid}
                              />
                            )}
                          </FormField>
                          <FormField id="profile-phone" label="No. HP" error={fieldErrors.phone}>
                            {({
                              id,
                              'aria-describedby': ariaDescribedBy,
                              'aria-invalid': ariaInvalid,
                            }) => (
                              <Input
                                id={id}
                                type="tel"
                                autoComplete="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                  setFormData({ ...formData, phone: e.target.value });
                                  if (fieldErrors.phone)
                                    setFieldErrors((f) => ({ ...f, phone: undefined }));
                                }}
                                className={cn(fieldErrors.phone && 'border-red-500')}
                                aria-describedby={ariaDescribedBy}
                                aria-invalid={ariaInvalid}
                              />
                            )}
                          </FormField>
                          <FormField
                            id="profile-email"
                            label="Email"
                            required
                            error={fieldErrors.email}
                            description="Gunakan email yang aktif untuk notifikasi dan pemulihan akun."
                          >
                            {({
                              id,
                              'aria-describedby': ariaDescribedBy,
                              'aria-invalid': ariaInvalid,
                            }) => (
                              <Input
                                id={id}
                                type="email"
                                required
                                autoComplete="email"
                                value={formData.email}
                                onChange={(e) => {
                                  setFormData({ ...formData, email: e.target.value });
                                  if (fieldErrors.email)
                                    setFieldErrors((f) => ({ ...f, email: undefined }));
                                }}
                                className={cn(fieldErrors.email && 'border-red-500')}
                                aria-describedby={ariaDescribedBy}
                                aria-invalid={ariaInvalid}
                              />
                            )}
                          </FormField>
                        </div>

                        <hr className="my-6 border-border" />

                        <h3 className="mb-2 text-base font-bold text-foreground">
                          Ubah Kata Sandi
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Kosongkan jika tidak ingin mengubah kata sandi.
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            id="profile-current-password"
                            label="Kata Sandi Saat Ini"
                            error={fieldErrors.current_password}
                            className="sm:col-span-2"
                          >
                            {({
                              id,
                              'aria-describedby': ariaDescribedBy,
                              'aria-invalid': ariaInvalid,
                            }) => (
                              <Input
                                id={id}
                                type="password"
                                autoComplete="current-password"
                                value={formData.current_password}
                                onChange={(e) => {
                                  setFormData({ ...formData, current_password: e.target.value });
                                  if (fieldErrors.current_password)
                                    setFieldErrors((f) => ({ ...f, current_password: undefined }));
                                }}
                                className={cn(fieldErrors.current_password && 'border-red-500')}
                                aria-describedby={ariaDescribedBy}
                                aria-invalid={ariaInvalid}
                              />
                            )}
                          </FormField>
                          <FormField
                            id="profile-new-password"
                            label="Kata Sandi Baru"
                            error={fieldErrors.new_password}
                          >
                            {({
                              id,
                              'aria-describedby': ariaDescribedBy,
                              'aria-invalid': ariaInvalid,
                            }) => (
                              <Input
                                id={id}
                                type="password"
                                autoComplete="new-password"
                                value={formData.new_password}
                                onChange={(e) => {
                                  setFormData({ ...formData, new_password: e.target.value });
                                  if (fieldErrors.new_password)
                                    setFieldErrors((f) => ({ ...f, new_password: undefined }));
                                }}
                                className={cn(fieldErrors.new_password && 'border-red-500')}
                                aria-describedby={ariaDescribedBy}
                                aria-invalid={ariaInvalid}
                              />
                            )}
                          </FormField>
                          <FormField
                            id="profile-confirm-password"
                            label="Konfirmasi Kata Sandi"
                            error={fieldErrors.confirm_password}
                          >
                            {({
                              id,
                              'aria-describedby': ariaDescribedBy,
                              'aria-invalid': ariaInvalid,
                            }) => (
                              <Input
                                id={id}
                                type="password"
                                autoComplete="new-password"
                                value={formData.confirm_password}
                                onChange={(e) => {
                                  setFormData({ ...formData, confirm_password: e.target.value });
                                  if (fieldErrors.confirm_password)
                                    setFieldErrors((f) => ({ ...f, confirm_password: undefined }));
                                }}
                                className={cn(fieldErrors.confirm_password && 'border-red-500')}
                                aria-describedby={ariaDescribedBy}
                                aria-invalid={ariaInvalid}
                              />
                            )}
                          </FormField>
                        </div>

                        <div className="flex justify-end pt-2">
                          <SubmitButton
                            type="submit"
                            disabled={profileLoading}
                            isLoading={saving}
                            label="Simpan Perubahan"
                            loadingLabel="Menyimpan..."
                          />
                        </div>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>
    </AdminPageShell>
  );
}
