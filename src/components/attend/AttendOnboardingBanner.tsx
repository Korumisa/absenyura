import { useState } from 'react';
import { Camera, MapPin, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'attend-onboarding-dismissed';

export function AttendOnboardingBanner({ onGoAttend }: { onGoAttend?: () => void }) {
  const [visible, setVisible] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== '1'
  );

  if (!visible) return null;

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30"
      aria-label="Panduan absensi pertama"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pertama kali absen?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Siapkan izin berikut agar check-in lancar:
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Tutup panduan"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1');
            setVisible(false);
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-foreground">
        <li className="flex items-start gap-2">
          <Camera className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          Izinkan akses kamera untuk scan QR dan foto bukti.
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          Aktifkan lokasi presisi di area kelas.
        </li>
        <li className="flex items-start gap-2">
          <Wifi className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          Hubungkan Wi‑Fi kampus jika diminta oleh dosen.
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1');
            setVisible(false);
          }}
        >
          Mengerti
        </Button>
        {onGoAttend ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onGoAttend}>
            Ke halaman absen
          </Button>
        ) : null}
      </div>
    </section>
  );
}
