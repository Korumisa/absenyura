import { toast } from 'sonner';

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
      const msg =
        typeof errorMsg === 'function' ? errorMsg(err) : (errorMsg ?? 'Terjadi kesalahan');
      toast.error(msg);
      onError?.(err);
      return undefined;
    }
  };
}
