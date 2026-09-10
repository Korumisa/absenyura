import { useCallback, useEffect, useRef } from 'react';
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

let isHistoryPatchedInstalled = false;
const HISTORY_WILL_CHANGE_EVENT = 'history-will-change';

function installHistoryMonkeyPatch() {
  if (isHistoryPatchedInstalled) return;
  if (typeof window === 'undefined' || !window.history) return;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  const emitChange = () => {
    window.dispatchEvent(new CustomEvent(HISTORY_WILL_CHANGE_EVENT));
  };

  window.history.pushState = function patchedPushState(...args: Parameters<typeof originalPushState>) {
    emitChange();
    return originalPushState(...args);
  };
  window.history.replaceState = function patchedReplaceState(...args: Parameters<typeof originalReplaceState>) {
    emitChange();
    return originalReplaceState(...args);
  };

  window.addEventListener('popstate', emitChange);
  isHistoryPatchedInstalled = true;
}

export function useFormDirtyGuard(
  dirty: boolean,
  opts: UseFormDirtyGuardOptions = {}
): UseFormDirtyGuardReturn {
  const { confirmMessage = DEFAULT_MESSAGE, enableUnloadGuard = true, enableBlocker = true } = opts;
  const blockerAvailableRef = useRef(false);

  try {
    useBlocker(() => {
      if (!enableBlocker) return false;
      if (!dirty) return false;
      return !window.confirm(confirmMessage);
    });
    blockerAvailableRef.current = true;
  } catch {
    blockerAvailableRef.current = false;
  }

  useEffect(() => {
    if (blockerAvailableRef.current) return undefined;
    installHistoryMonkeyPatch();

    const handler = () => {
      if (!enableBlocker) return;
      if (!dirty) return;
      if (!window.confirm(confirmMessage)) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener(HISTORY_WILL_CHANGE_EVENT, handler);
    return () => window.removeEventListener(HISTORY_WILL_CHANGE_EVENT, handler);
  }, [dirty, enableBlocker, confirmMessage]);

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
