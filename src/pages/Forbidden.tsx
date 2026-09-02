import { ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

type ForbiddenLocationState = { from?: string };

export default function Forbidden() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const state = location.state as ForbiddenLocationState | null;
  const defaultBack =
    user?.role === 'CONTENT_ADMIN' ? '/public-site/profile' : user ? '/dashboard' : '/login';
  const backTo = state?.from ?? defaultBack;

  useEffect(() => {
    toast.error('Akses ditolak: Anda tidak memiliki izin mengakses halaman ini.');
  }, []);

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <div className="p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert size={30} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Akses ditolak
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika
            menurut Anda ini adalah kesalahan.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full sm:flex-1 font-semibold">
              <Link to={backTo}>
                {state?.from ? 'Kembali ke Halaman Sebelumnya' : 'Kembali ke Beranda'}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:flex-1 font-semibold"
              onClick={() => logout()}
            >
              Keluar
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Kode error: 403 Forbidden — akses peran terbatas.
          </p>
        </div>
      </div>
    </div>
  );
}
