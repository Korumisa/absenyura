import { Button } from '@/components/ui/button';
import { ConfirmModalProps } from '@/types/confirmodal'

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
  if (!isOpen) return null;

  const buttonColor = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-zinc-800">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h2>
          <div className="text-slate-600 dark:text-zinc-400 text-sm">
            {description}
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm} className={buttonColor}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
