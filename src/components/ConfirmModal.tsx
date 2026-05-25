import { Loader2 } from 'lucide-react'
import { ConfirmModalProps } from '@/types/confirmodal'
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
  const actionClassName =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : variant === 'warning'
        ? 'bg-orange-600 hover:bg-orange-700'
        : 'bg-brand hover:bg-brand/90'

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={actionClassName}
            onClick={(e) => {
              if (loading) {
                e.preventDefault();
                return;
              }
              onConfirm();
            }}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
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
