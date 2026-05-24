import type { SWRResponse } from 'swr';

/** [UX] P1 — state SWR terstandar: loading / error / empty / data */
export function useSwrPageState<T>(swr: Pick<SWRResponse<T>, 'data' | 'error' | 'isLoading' | 'isValidating' | 'mutate'>) {
  const { data, error, isLoading, isValidating, mutate } = swr;

  const isInitialLoading = isLoading && data === undefined && !error;
  const isError = Boolean(error) && data === undefined;
  const isRefreshing = isValidating && data !== undefined;

  const isEmptyArray = Array.isArray(data) && data.length === 0;
  const isEmpty = !isInitialLoading && !isError && isEmptyArray;

  return {
    data,
    error,
    isInitialLoading,
    isRefreshing,
    isError,
    isEmpty,
    mutate,
    retry: () => void mutate(),
  };
}
