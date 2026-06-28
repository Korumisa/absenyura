import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { ArrowRight, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/components/PublicLayout';
import PublicEnter from '@/components/PublicEnter';
import useSWR from 'swr';
import type { PublicProfile } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { getDeviceFingerprint } from '@/lib/storage/deviceFingerprint';
import { BrandLogoImage } from '@/components/public/BrandLogoImage';
import { getPostLoginTarget } from '@/lib/auth/postLoginTarget';

export default function Login() {
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, isLoading: profileLoading } = useSWR<PublicProfile | null>(
    '/public-site/profile',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Halaman publik — selalu tampilan terang meski preferensi admin mode gelap
  React.useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => {
      if (hadDark) root.classList.add('dark');
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setLoginError(null);
    try {
      const device_fingerprint = await getDeviceFingerprint();

      const res = await api.post('/auth/login', { nim, password, device_fingerprint });
      const { user } = res.data.data;
      setAuth(user);
      toast.success('Berhasil masuk!');

      const target = getPostLoginTarget(location.state?.from, user);
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        status === 429
          ? 'Terlalu banyak percobaan login. Tunggu 2–3 menit lalu coba lagi.'
          : getErrorMessage(err, 'Gagal masuk. Periksa NIM dan kata sandi Anda.');
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <PublicEnter>
        <section className="relative flex flex-1 items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_50%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent)] px-4 py-10">
          <div className="absolute -left-12 top-16 size-72 rounded-full bg-[var(--public-primary)]/20 blur-3xl" />
          <div className="absolute -right-16 bottom-10 size-80 rounded-full bg-sky-400/15 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-5xl items-stretch gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-3">
                {profileLoading ? (
                  <>
                    <Skeleton className="size-14 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </>
                ) : (
                  <>
                    <BrandLogoImage
                      src={profile?.logo_light_url}
                      alt="Logo"
                      className="size-14 rounded-2xl bg-white/70 p-2 ring-1 ring-black/10"
                      priority
                    />
                    <div>
                      <div className="text-sm font-extrabold tracking-tight text-slate-900">
                        {profile?.org_name ? profile.org_name : 'Profil belum diatur'}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {profile?.campus_name ? profile.campus_name : 'Konten Website'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <h1 className="mt-6 tracking-tight text-slate-900">
                <span className="block font-display text-4xl italic md:text-5xl">Masuk</span>
                <span className="mt-1 block text-5xl font-extrabold uppercase text-[var(--public-primary)] md:text-6xl">
                  Dashboard
                </span>
              </h1>
              <p className="mt-4 max-w-md text-sm text-slate-700">
                Masuk untuk absen, lihat riwayat kehadiran, dan persentase kehadiran Anda.
              </p>

              <div className="mt-8">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--public-primary)] hover:brightness-110"
                >
                  Kembali ke Beranda
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-7 shadow-[0_28px_70px_-52px_rgba(15,23,42,0.5)] backdrop-blur">
              <div className="pointer-events-none absolute -top-12 left-10 size-40 rounded-full bg-[var(--public-primary)]/14 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 right-6 size-48 rounded-full bg-sky-400/12 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--public-primary)]/12 text-[var(--public-primary)]">
                    <LogIn size={22} />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold tracking-tight text-slate-900">
                      Masuk Akun
                    </div>
                    <div className="text-sm text-muted-foreground">Gunakan NIM dan kata sandi.</div>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-5" aria-busy={loading}>
                  {loginError ? (
                    <div
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                      role="alert"
                    >
                      {loginError}
                    </div>
                  ) : null}
                  <div
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
                    role="note"
                  >
                    Akun dibuat oleh admin kampus. Belum punya akun? Hubungi pengurus HM atau bagian
                    akademik fakultas Anda.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nim">NIM</Label>
                    <Input
                      id="nim"
                      type="text"
                      name="nim"
                      autoComplete="username"
                      spellCheck={false}
                      required
                      placeholder="Masukkan NIM Anda"
                      value={nim}
                      onChange={(e) => setNim(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Kata Sandi</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pr-12"
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-sm font-semibold text-[var(--public-primary)] hover:brightness-110"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="h-11 w-full bg-[var(--public-primary)] text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] hover:brightness-110"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                        Memverifikasi…
                      </>
                    ) : (
                      'Masuk'
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </PublicEnter>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lupa kata sandi?</DialogTitle>
            <DialogDescription>
              Reset kata sandi dilakukan oleh admin. Hubungi kontak berikut dengan NIM Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-700">
            {profile?.email ? (
              <p>
                Email:{' '}
                <a
                  href={`mailto:${profile.email}`}
                  className="font-semibold text-[var(--public-primary)]"
                >
                  {profile.email}
                </a>
              </p>
            ) : null}
            {profile?.phone ? (
              <p>
                Telepon:{' '}
                <a
                  href={`tel:${profile.phone}`}
                  className="font-semibold text-[var(--public-primary)]"
                >
                  {profile.phone}
                </a>
              </p>
            ) : null}
            {!profile?.email && !profile?.phone ? (
              <p>
                Kontak admin belum diatur di profil situs publik. Silakan hubungi pengurus HM
                langsung.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
