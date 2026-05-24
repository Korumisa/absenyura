import { useEffect, useRef, useState } from 'react';
import type { SWRResponse } from 'swr';

const SLOW_LOADING_MS = 5000;

/** [UX] P1 — state SWR terstandar: loading / error / empty / data / slow loading */
export function useSwrPageState<T>(swr: Pick<SWRResponse<T>, 'data' | 'error' | 'isLoading' | 'isValidating' | 'mutate'>) {
  const { data, error, isLoading, isValidating, mutate } = swr;
  const loadingStartedRef = useRef<number | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  const isInitialLoading = isLoading && data === undefined && !error;
  const isError = Boolean(error) && data === undefined;
  const isRefreshing = isValidating && data !== undefined;

  const isEmptyArray = Array.isArray(data) && data.length === 0;
  const isEmpty = !isInitialLoading && !isError && isEmptyArray;

  useEffect(() => {
    if (isInitialLoading) {
      if (loadingStartedRef.current === null) {
        loadingStartedRef.current = Date.now();
      }
      const timer = window.setTimeout(() => {
        if (loadingStartedRef.current !== null) {
          setIsSlowLoading(true);
        }
      }, SLOW_LOADING_MS);
      return () => window.clearTimeout(timer);
    }
    loadingStartedRef.current = null;
    setIsSlowLoading(false);
  }, [isInitialLoading]);

  return {
    data,
    error,
    isInitialLoading,
    isRefreshing,
    isError,
    isEmpty,
    isSlowLoading,
    mutate,
    retry: () => void mutate(),
  };
}
