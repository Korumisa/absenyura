import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ConfirmModalProps } from '@/types/confirmModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [confirming, setConfirming] = useState(false)
  const busy = loading || confirming

  const actionClassName =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : variant === 'warning'
        ? 'bg-orange-600 hover:bg-orange-700'
        : 'bg-brand hover:bg-brand/90'

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (busy) return

    const result = onConfirm()
    if (result && typeof (result as Promise<void>).then === 'function') {
      setConfirming(true)
      try {
        await result
      } finally {
        setConfirming(false)
      }
    }
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
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
          <AlertDialogAction
            className={actionClassName}
            onClick={handleConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {loadingText}
              </span>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
