import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/theme-provider';
import { Moon, Sun } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminPageShell from '@/components/AdminPageShell';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { toastErrorMessage } from '@/lib/toastMessage';
import { cn } from '@/lib/utils';

type ProfileField = 'name' | 'email' | 'phone' | 'current_password' | 'new_password' | 'confirm_password';
type FieldErrors = Partial<Record<ProfileField, string>>;

function parseFieldErrors(err: unknown): FieldErrors {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status !== 422) return {};
  const raw = (err as { response?: { data?: { errors?: Record<string, string | string[]> } } })?.response?.data
    ?.errors;
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
  const { theme, setTheme, toggleTheme } = useTheme();
  
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
    confirm_password: ''
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error('Kata sandi baru tidak cocok');
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const res = await api.put('/settings/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      
      // Update local state
      setAuth({ ...user!, name: formData.name, email: formData.email });
      
      toast.success(res.data.message || 'Profil berhasil diperbarui');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error: unknown) {
      const fields = parseFieldErrors(error);
      if (Object.keys(fields).length > 0) setFieldErrors(fields);
      toast.error(toastErrorMessage(error, 'Gagal memperbarui profil'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell
      title="Pengaturan"
      description="Kelola profil, kata sandi, dan preferensi akun Anda."
      variant="plain"
      icon={<User className="h-5 w-5" />}
    >
      <div className="max-w-3xl space-y-6">
          
          {activeTab === 'profile' && profileError ? (
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
          ) : activeTab === 'profile' && (
            <>
              {/* Profile Form */}
              {/* [UX] #4 — preferensi tampilan */}
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm border-border bg-muted">
                <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-white">Tampilan</h2>
                <p className="mb-4 text-sm text-muted-foreground text-muted-foreground">Mode gelap mengurangi silau saat absensi malam hari.</p>
                <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                  {theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
                </Button>
              </div>

              <div className="bg-white bg-muted rounded-xl border border-border border-border shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Informasi Profil</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
                  }}
                  className={cn(fieldErrors.name && 'border-red-500')}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                {fieldErrors.name ? (
                  <p id="name-error" className="text-xs text-red-600">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (fieldErrors.phone) setFieldErrors((f) => ({ ...f, phone: undefined }));
                  }}
                  className={cn(fieldErrors.phone && 'border-red-500')}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                />
                {fieldErrors.phone ? (
                  <p id="phone-error" className="text-xs text-red-600">
                    {fieldErrors.phone}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  className={cn(fieldErrors.email && 'border-red-500')}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email ? (
                  <p id="email-error" className="text-xs text-red-600">
                    {fieldErrors.email}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground mt-1">Gunakan email yang aktif untuk notifikasi dan pemulihan akun.</p>
              </div>
              
              <hr className="my-6 border-border border-border" />
              
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Ubah Kata Sandi</h3>
              <p className="text-sm text-muted-foreground text-muted-foreground mb-4">Kosongkan jika tidak ingin mengubah kata sandi.</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kata Sandi Saat Ini</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={formData.current_password}
                    onChange={(e) => {
                      setFormData({ ...formData, current_password: e.target.value });
                      if (fieldErrors.current_password)
                        setFieldErrors((f) => ({ ...f, current_password: undefined }));
                    }}
                    className={cn(fieldErrors.current_password && 'border-red-500')}
                    aria-invalid={!!fieldErrors.current_password}
                    aria-describedby={fieldErrors.current_password ? 'current-password-error' : undefined}
                  />
                  {fieldErrors.current_password ? (
                    <p id="current-password-error" className="text-xs text-red-600">
                      {fieldErrors.current_password}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kata Sandi Baru</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={formData.new_password}
                      onChange={(e) => {
                        setFormData({ ...formData, new_password: e.target.value });
                        if (fieldErrors.new_password) setFieldErrors((f) => ({ ...f, new_password: undefined }));
                      }}
                      className={cn(fieldErrors.new_password && 'border-red-500')}
                      aria-invalid={!!fieldErrors.new_password}
                      aria-describedby={fieldErrors.new_password ? 'new-password-error' : undefined}
                    />
                    {fieldErrors.new_password ? (
                      <p id="new-password-error" className="text-xs text-red-600">
                        {fieldErrors.new_password}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Konfirmasi Kata Sandi</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={formData.confirm_password}
                      onChange={(e) => {
                        setFormData({ ...formData, confirm_password: e.target.value });
                        if (fieldErrors.confirm_password)
                          setFieldErrors((f) => ({ ...f, confirm_password: undefined }));
                      }}
                      className={cn(fieldErrors.confirm_password && 'border-red-500')}
                      aria-invalid={!!fieldErrors.confirm_password}
                      aria-describedby={fieldErrors.confirm_password ? 'confirm-password-error' : undefined}
                    />
                    {fieldErrors.confirm_password ? (
                      <p id="confirm-password-error" className="text-xs text-red-600">
                        {fieldErrors.confirm_password}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={saving || profileLoading}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white bg-muted rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm p-6 mt-6">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2">Manajemen Perangkat</h2>
            <p className="text-sm text-muted-foreground text-muted-foreground mb-4">Logout paksa dari perangkat ini (akan menghapus sesi token).</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                localStorage.removeItem('device_fingerprint');
                toast.success('Perangkat dilupakan. Anda akan diminta login kembali pada percobaan berikutnya.');
              }}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-500 dark:hover:bg-red-900/20"
            >
              <LogOut size={16} /> Lupakan Perangkat Ini
            </Button>
          </div>
          </>
        )}
      </div>
    </AdminPageShell>
  );
}
