import { useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';
import type { SWRConfiguration, SWRResponse } from 'swr';
import { useSwrPageState } from './useSwrPageState';
import { USE_MOCK_LANDING } from '@/lib/utils/mockLandingData';

type SwrShape<T> = Pick<SWRResponse<T>, 'data' | 'error' | 'isLoading' | 'isValidating' | 'mutate'>;

/** [DRY - USE_MOCK_LANDING] Hook generik untuk sub-halaman landing page.
 *  Ketika USE_MOCK_LANDING=true: return MOCK DATA secara sinkron dengan shape identik useSwrPageState.
 *  Ketika false: jalankan useSWR + useSwrPageState normal.
 *  CATATAN: Semua React hooks dipanggil UNCONDITIONALLY (mematuhi Rules of Hooks). */
export function useMockOrSwr<T>(
  opts:
    | {
        swrKey: string | null | false;
        fetcher: (url: string) => Promise<T>;
        mockStatic: T | (() => T);
        swrConfig?: SWRConfiguration<T>;
      }
    | {
        useStaticOnly: true;
        mockStatic: T | (() => T);
      }
): {
  swr: SwrShape<T>;
  data: T | undefined;
  error: unknown;
  isInitialLoading: boolean;
  isPending: boolean;
  isRefreshing: boolean;
  isError: boolean;
  isEmpty: boolean;
  isSlowLoading: boolean;
  showSlowLoadingHint: boolean;
  mutate: SWRResponse<T>['mutate'];
  retry: () => void;
} {
  const optsHasSwr = 'swrKey' in opts;
  const mockOpts = opts as { mockStatic: T | (() => T) };
  const staticValue = useMemo<T>(() => {
    const m = mockOpts.mockStatic;
    return typeof m === 'function' ? (m as () => T)() : m;
  }, [mockOpts.mockStatic]);

  const noopMutate: SWRResponse<T>['mutate'] = useCallback(async () => staticValue, [staticValue]);
  const noopRetry = useCallback(() => {}, []);

  const mutateRef = useRef<{ fn: SWRResponse<T>['mutate'] }>({ fn: noopMutate });
  mutateRef.current.fn = noopMutate;

  const effectiveKey = optsHasSwr && !USE_MOCK_LANDING ? opts.swrKey : null;
  const effectiveFetcher = optsHasSwr && !USE_MOCK_LANDING ? opts.fetcher : undefined;
  const effectiveConfig = optsHasSwr && !USE_MOCK_LANDING ? opts.swrConfig : undefined;

  const swr = useSWR<T>(effectiveKey, effectiveFetcher as (url: string) => Promise<T>, {
    revalidateOnFocus: false,
    ...(effectiveConfig ?? {}),
  });
  const pageState = useSwrPageState<T>(swr);

  const shouldUseStatic = USE_MOCK_LANDING || !optsHasSwr;
  mutateRef.current.fn = shouldUseStatic ? noopMutate : swr.mutate;

  if (shouldUseStatic) {
    const emptyArr = Array.isArray(staticValue) && staticValue.length === 0;
    return {
      swr: {
        data: staticValue,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: noopMutate,
      },
      data: staticValue,
      error: null,
      isInitialLoading: false,
      isPending: false,
      isRefreshing: false,
      isError: false,
      isEmpty: emptyArr,
      isSlowLoading: false,
      showSlowLoadingHint: false,
      mutate: noopMutate,
      retry: noopRetry,
    };
  }

  return { swr, ...pageState };
}
