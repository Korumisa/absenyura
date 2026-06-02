import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'attend-privacy-dismissed';

export function AttendPrivacyBanner() {
  const [visible, setVisible] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) !== '1'
  );

  if (!visible) return null;

  return (
    <div
      className="mb-6 flex gap-3 rounded-xl border border-border bg-muted/40 p-4"
      role="note"
      aria-label="Informasi privasi absensi"
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm text-muted-foreground">
        Kami mencatat lokasi GPS, foto bukti, dan identitas perangkat untuk verifikasi kehadiran.
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Tutup"
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, '1');
          setVisible(false);
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
