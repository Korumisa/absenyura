import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MaintenancePage(props: { reason?: string; onRetry?: () => void }) {
  const reason = props.reason || 'Layanan sedang mengalami gangguan atau dalam pemeliharaan.';

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-[#e6edf5] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <div className="p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2f80ed]">
            <Wrench size={30} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Maintenance
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {reason}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button className="w-full sm:flex-1 font-semibold" onClick={() => (props.onRetry ? props.onRetry() : window.location.reload())}>
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              className="w-full sm:flex-1 font-semibold"
              onClick={() => window.location.reload()}
            >
              Refresh Halaman
            </Button>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Jika masalah berlanjut, coba beberapa saat lagi.
          </p>
        </div>
      </div>
    </div>
  );
}

