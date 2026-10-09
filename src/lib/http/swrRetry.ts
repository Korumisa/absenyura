import type { SWRConfiguration } from 'swr';

export const boundedSWRRetry: NonNullable<SWRConfiguration['onErrorRetry']> = (
  error,
  _key,
  config,
  revalidate,
  options
) => {
  const failure = error as {
    config?: { _transientRetry?: boolean };
    response?: {
      status?: number;
      data?: { retry_after_ms?: number };
      headers?: Record<string, string>;
    };
  };
  const status = failure?.response?.status;
  const maxRetries = config.errorRetryCount ?? 2;
  // Axios already owns one safe retry; never multiply it through SWR.
  if (
    failure?.config?._transientRetry ||
    (status && status >= 400 && status < 500) ||
    options.retryCount > maxRetries
  )
    return;
  const hint =
    Number(failure?.response?.data?.retry_after_ms) ||
    Number(failure?.response?.headers?.['retry-after']) * 1000 ||
    0;
  const delay = Math.min(
    900_000,
    Math.max(hint, (config.errorRetryInterval ?? 1000) * 2 ** Math.min(options.retryCount, 8))
  );
  setTimeout(
    () => {
      void revalidate(options);
    },
    delay + Math.random() * 1000
  );
};
