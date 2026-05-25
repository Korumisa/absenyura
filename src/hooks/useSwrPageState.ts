import { useCallback, useEffect, useRef, useState } from 'react';
import type { SWRResponse } from 'swr';
import {
  AUTO_RETRY_INTERVAL_MS,
  MAX_AUTO_RETRIES,
  SLOW_LOADING_MS,
  computeIsPending,
  shouldShowErrorUi,
  shouldShowSlowLoadingHint,
} from './swrPageStateLogic';

/** [UX] State SWR terstandar: skeleton saat menunggu, retry otomatis, error UI setelah percobaan habis */
export function useSwrPageState<T>(swr: Pick<SWRResponse<T>, 'data' | 'error' | 'isLoading' | 'isValidating' | 'mutate'>) {
  const { data, error, isLoading, isValidating, mutate } = swr;
  const loadingStartedRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [showErrorUi, setShowErrorUi] = useState(false);

  const isInitialLoading = isLoading && data === undefined && !error;
  const isFetchFailed = Boolean(error) && data === undefined;

  const isEmptyArray = Array.isArray(data) && data.length === 0;
  const isEmpty = !isInitialLoading && !showErrorUi && isEmptyArray;

  useEffect(() => {
    if (data !== undefined) {
      setAutoRetryCount(0);
      setShowErrorUi(false);
      setIsSlowLoading(false);
    }
  }, [data]);

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
    if (!isLoading) {
      setIsSlowLoading(false);
    }
  }, [isInitialLoading, isLoading]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const scheduleAutoRetry = useCallback(() => {
    clearRetryTimer();
    const delay =
      autoRetryCount === 0
        ? isFetchFailed
          ? 2500
          : isSlowLoading
            ? 500
            : AUTO_RETRY_INTERVAL_MS
        : AUTO_RETRY_INTERVAL_MS;
    retryTimerRef.current = setTimeout(() => {
      void mutate();
      setAutoRetryCount((c) => c + 1);
    }, delay);
  }, [autoRetryCount, clearRetryTimer, isFetchFailed, isSlowLoading, mutate]);

  useEffect(() => {
    const shouldAutoRetry =
      (isSlowLoading || isFetchFailed) && autoRetryCount < MAX_AUTO_RETRIES && !showErrorUi;

    if (!shouldAutoRetry) {
      clearRetryTimer();
      return;
    }

    scheduleAutoRetry();
    return clearRetryTimer;
  }, [isSlowLoading, isFetchFailed, autoRetryCount, showErrorUi, scheduleAutoRetry, clearRetryTimer]);

  useEffect(() => {
    if (shouldShowErrorUi(isFetchFailed, autoRetryCount)) {
      setShowErrorUi(true);
    }
  }, [autoRetryCount, isFetchFailed]);

  const isPending = computeIsPending(isInitialLoading, isSlowLoading, isFetchFailed, showErrorUi);
  const isRefreshing = isValidating && data !== undefined;
  const isError = showErrorUi;
  const showSlowLoadingHint = shouldShowSlowLoadingHint(
    isSlowLoading,
    isFetchFailed,
    data !== undefined,
    autoRetryCount,
  );

  return {
    data,
    error,
    isInitialLoading,
    isPending,
    isRefreshing,
    isError,
    isEmpty,
    isSlowLoading,
    showSlowLoadingHint,
    mutate,
    retry: () => {
      setAutoRetryCount(0);
      setShowErrorUi(false);
      clearRetryTimer();
      void mutate();
    },
  };
}
