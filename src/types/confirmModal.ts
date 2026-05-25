import { ReactNode } from 'react';
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  /** Saat true: tombol confirm dinonaktifkan, label diganti, modal tidak bisa ditutup */
  loading?: boolean;
  /** Label tombol confirm saat loading (default: "Memproses…") */
  loadingText?: string;
}
