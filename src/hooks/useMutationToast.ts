import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/http/errorMessage';

type UseMutationToastOptions<T> = {
  successMsg?: string | ((res: T) => string);
  errorMsg?: string | ((err: unknown) => string);
  onSuccess?: (res: T) => void;
  onError?: (err: unknown) => void;
};

export function useMutationToast<T>(
  call: () => Promise<T>,
  opts: UseMutationToastOptions<T> = {}
): () => Promise<T | undefined> {
  const { successMsg, errorMsg, onSuccess, onError } = opts;

  return async () => {
    try {
      const res = await call();
      const msg = typeof successMsg === 'function' ? successMsg(res) : (successMsg ?? 'Berhasil');
      toast.success(msg);
      onSuccess?.(res);
      return res;
    } catch (err: unknown) {
      // [UX STRUCTURED ERROR]: default otomatis pakai getErrorMessage() yang sudah
      // punya mapping spesifik ke error type: jaringan, 401 sesi habis, 403 akses,
      // 413 file besar, 422 validasi server, 500 database/prisma gangguan.
      // User bisa override lewat opts.errorMsg jika butuh kata-kata khusus.
      const msg =
        typeof errorMsg === 'function'
          ? errorMsg(err)
          : (errorMsg ?? getErrorMessage(err, 'Terjadi kesalahan. Silakan coba lagi.'));
      toast.error(msg, { duration: 6000 });
      onError?.(err);
      return undefined;
    }
  };
}
