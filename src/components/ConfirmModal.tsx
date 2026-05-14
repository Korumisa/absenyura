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
  variant = 'danger'
}: ConfirmModalProps) {
  const actionClassName =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : variant === 'warning'
        ? 'bg-orange-600 hover:bg-orange-700'
        : 'bg-indigo-600 hover:bg-indigo-700'

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction className={actionClassName} onClick={onConfirm}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
