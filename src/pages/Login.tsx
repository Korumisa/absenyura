import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        if (user.role === 'SUPER_ADMIN') target = '/dashboard';
        else if (user.role === 'ADMIN') target = '/sessions';
        else if (user.role === 'USER') target = '/dashboard';
      }

      navigate(target, { replace: true });
    } catch (err: any) {
      let errorMsg = 'Gagal masuk. Periksa email dan kata sandi Anda.';
      if (err.response?.data?.error) {
        if (typeof err.response.data.error === 'string') {
          errorMsg = err.response.data.error;
        } else if (typeof err.response.data.error === 'object' && err.response.data.error.message) {
          errorMsg = err.response.data.error.message;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-700 p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full text-indigo-600 dark:text-indigo-400">
            <LogIn size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Masuk ke Akun Anda</h2>
        <p className="text-center text-slate-500 dark:text-zinc-400 mb-8">Sistem Absensi Akademik Terpadu</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => toast.info('Silakan hubungi Admin untuk reset kata sandi.')}
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Lupa kata sandi?
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Memverifikasi…' : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Masuk ke Sistem
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
