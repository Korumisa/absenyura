import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/components/PublicLayout';
import PublicEnter from '@/components/PublicEnter';
import PublicLoadingOverlay from '@/components/PublicLoadingOverlay';
import useSWR from 'swr';
import type { PublicProfile } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: profile, isLoading: profileLoading } = useSWR<PublicProfile | null>('/public-site/profile', fetcher, { revalidateOnFocus: false });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      // Simulating device fingerprint using a simple random string stored in localStorage
      let device_fingerprint = localStorage.getItem('device_fingerprint');
      if (!device_fingerprint) {
        device_fingerprint = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_fingerprint', device_fingerprint);
      }

      const res = await api.post('/auth/login', { email, password, device_fingerprint });
      const { user } = res.data.data;
      setAuth(user);
      toast.success('Berhasil masuk!');
      
      let target = location.state?.from?.pathname;
      if (!target || target === '/dashboard') {
        // [IA] #10 — redirect konsisten ke dashboard (kecuali content admin)
        if (user.role === 'CONTENT_ADMIN') target = '/public-site/profile';
        else target = '/dashboard';
      }

      navigate(target, { replace: true });
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Gagal masuk. Periksa email/NIM dan kata sandi Anda.');
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <PublicEnter>
        <PublicLoadingOverlay show={loading} label="Memverifikasi akun…" />
        <section className="relative flex flex-1 items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_50%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent)] px-4 py-10 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_55%),radial-gradient(circle_at_70%_10%,rgba(59,130,246,0.16),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.85))]">
          <div className="absolute -left-12 top-16 h-72 w-72 rounded-full bg-[var(--public-primary)]/20 blur-3xl" />
          <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-5xl items-stretch gap-8 md:grid-cols-2">
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-3">
              {profileLoading ? (
                <>
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={profile?.logo_light_url || '/3.%20HM%20SDP.png'}
                    alt="Logo"
                    className="h-14 w-14 rounded-2xl bg-white/70 p-2 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10"
                  />
                  <div>
                    <div className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {profile?.org_name ? profile.org_name : 'Profil belum diatur'}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-300">
                      {profile?.campus_name ? profile.campus_name : 'Konten Website'}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 font-display text-4xl italic tracking-tight text-slate-900 dark:text-white md:text-5xl">Masuk</div>
            <div className="mt-1 text-5xl font-extrabold uppercase tracking-tight text-[var(--public-primary)] md:text-6xl">
              Dashboard
            </div>
            <div className="mt-4 max-w-md text-sm text-slate-700 dark:text-slate-300">
              Masuk untuk absen, lihat riwayat kehadiran, dan persentase kehadiran Anda.
            </div>

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

          <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-7 shadow-[0_28px_70px_-52px_rgba(15,23,42,0.5)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_28px_70px_-52px_rgba(0,0,0,0.8)]">
            <div className="pointer-events-none absolute -top-12 left-10 h-40 w-40 rounded-full bg-[var(--public-primary)]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 right-6 h-48 w-48 rounded-full bg-sky-400/12 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--public-primary)]/12 text-[var(--public-primary)]">
                  <LogIn size={22} />
                </div>
                <div>
                  <div className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Masuk Akun</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Gunakan email/NIM dan kata sandi.</div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="mt-8 space-y-5" aria-busy={loading}>
                {loginError ? (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
                    role="alert"
                  >
                    {loginError}
                  </div>
                ) : null}
                <div
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100"
                  role="note"
                >
                  Akun dibuat oleh admin kampus. Belum punya akun? Hubungi pengurus HM atau bagian akademik fakultas Anda.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email atau NIM</Label>
                  <Input
                    id="email"
                    type="text"
                    name="email"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    placeholder="email@kampus.ac.id atau NIM Anda"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-primary)]/35"
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
                  className="h-11 w-full bg-[var(--public-primary)] text-white shadow-[0_16px_32px_rgba(37,99,235,0.35)] hover:brightness-110"
                >
                  {loading ? 'Memverifikasi…' : 'Masuk'}
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
              Reset kata sandi dilakukan oleh admin. Hubungi kontak berikut dengan email/NIM Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-700 dark:text-zinc-300">
            {profile?.email ? (
              <p>
                Email:{' '}
                <a href={`mailto:${profile.email}`} className="font-semibold text-[var(--public-primary)]">
                  {profile.email}
                </a>
              </p>
            ) : null}
            {profile?.phone ? (
              <p>
                Telepon:{' '}
                <a href={`tel:${profile.phone}`} className="font-semibold text-[var(--public-primary)]">
                  {profile.phone}
                </a>
              </p>
            ) : null}
            {!profile?.email && !profile?.phone ? (
              <p>Kontak admin belum diatur di profil situs publik. Silakan hubungi pengurus HM langsung.</p>
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
