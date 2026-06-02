import { getErrorMessage } from '@/lib/http/errorMessage';
import { toast } from 'sonner';

/** [UX] Toast error maks 80 karakter — detail lengkap di banner ErrorWithRetry */
export function toastErrorMessage(err: unknown, fallback: string, maxLen = 80): string {
  const message = getErrorMessage(err, fallback);
  if (message.length <= maxLen) return message;
  return `${message.slice(0, maxLen - 1).trimEnd()}…`;
}

export function toastError(err: unknown, fallback: string) {
  toast.error(toastErrorMessage(err, fallback), { duration: 5000 });
}

export function toastSuccess(message: string) {
  toast.success(message, { duration: 3000 });
}

export function toastInfo(message: string) {
  toast(message, { duration: 4000 });
}
