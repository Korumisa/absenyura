import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ConfirmModalProps } from '@/types/confirmModal';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Ya, Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
  loadingText = 'Memproses…',
}: ConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);
  const busy = loading || confirming;

  const actionVariant =
    variant === 'danger' ? 'destructive' : variant === 'warning' ? 'warning' : 'default';

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (busy) return;

    const result = onConfirm();
    if (result && typeof (result as Promise<void>).then === 'function') {
      setConfirming(true);
      try {
        await result;
      } finally {
        setConfirming(false);
      }
    }
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={busy}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction asChild disabled={busy} aria-busy={busy} onClick={handleConfirm}>
            <Button variant={actionVariant} disabled={busy}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {loadingText}
                </span>
              ) : (
                confirmText
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
