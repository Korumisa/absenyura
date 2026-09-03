import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

type UseFormDirtyGuardOptions = {
  confirmMessage?: string;
  enableUnloadGuard?: boolean;
  enableBlocker?: boolean;
};

type UseFormDirtyGuardReturn = {
  confirmIfDirty: () => Promise<boolean>;
};

const DEFAULT_MESSAGE =
  'Perubahan belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?';

export function useFormDirtyGuard(
  dirty: boolean,
  opts: UseFormDirtyGuardOptions = {}
): UseFormDirtyGuardReturn {
  const { confirmMessage = DEFAULT_MESSAGE, enableUnloadGuard = true, enableBlocker = true } = opts;

  try {
    useBlocker(() => {
      if (!enableBlocker) return false;
      if (!dirty) return false;
      return !window.confirm(confirmMessage);
    });
  } catch {
    // useBlocker is only available inside Data Router <RouterProvider>; ignore outside routing context
    // (per-component throw is consistent across renders so React hook registration order invariant holds)
  }

  useEffect(() => {
    if (!enableUnloadGuard) return undefined;
    if (!dirty) return undefined;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = confirmMessage;
      return confirmMessage;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, enableUnloadGuard, confirmMessage]);

  const confirmIfDirty = useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    return window.confirm(confirmMessage);
  }, [dirty, confirmMessage]);

  return { confirmIfDirty };
}
