import { Compass } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export default function NotFound() {
  const location = useLocation();
  const { user } = useAuthStore();
  const defaultBack =
    user?.role === 'CONTENT_ADMIN' ? '/public-site/profile' : user ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <div className="p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Compass size={30} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Kami tidak dapat menemukan halaman{' '}
            <code className="rounded border border-sidebar-border bg-muted px-1.5 py-0.5 text-xs">
              {location.pathname}
            </code>
            . Mungkin tautan sudah tidak berlaku atau Anda salah mengetik alamat.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full sm:flex-1 font-semibold">
              <Link to={defaultBack}>Kembali ke Dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:flex-1 font-semibold">
              <Link to="/">Kembali ke Beranda</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Jika Anda merasa ini adalah kesalahan, hubungi administrator sistem.
          </p>
        </div>
      </div>
    </div>
  );
}
