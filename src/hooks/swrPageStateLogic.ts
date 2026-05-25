export const SLOW_LOADING_MS = 5000;
export const AUTO_RETRY_INTERVAL_MS = 6000;
export const MAX_AUTO_RETRIES = 4;

/** Error UI hanya jika fetch benar-benar gagal — bukan karena lambat saja */
export function shouldShowErrorUi(isFetchFailed: boolean, autoRetryCount: number): boolean {
  return isFetchFailed && autoRetryCount >= MAX_AUTO_RETRIES;
}

export function shouldShowSlowLoadingHint(
  isSlowLoading: boolean,
  isFetchFailed: boolean,
  hasData: boolean,
  autoRetryCount: number,
): boolean {
  return isSlowLoading && !isFetchFailed && !hasData && autoRetryCount >= MAX_AUTO_RETRIES;
}

export function computeIsPending(
  isInitialLoading: boolean,
  isSlowLoading: boolean,
  isFetchFailed: boolean,
  showErrorUi: boolean,
): boolean {
  return isInitialLoading || ((isSlowLoading || isFetchFailed) && !showErrorUi);
}
