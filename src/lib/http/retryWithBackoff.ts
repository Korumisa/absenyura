export interface RetryWithBackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  getRetryAfterHint?: (error: unknown) => number | undefined;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 400;

function defaultShouldRetry(error: unknown): boolean {
  const err = error as { response?: { status?: unknown } };
  const status = Number(err?.response?.status);
  return (
    Number.isFinite(status) &&
    (status === 500 || status === 502 || status === 503 || status === 504)
  );
}

function defaultGetRetryAfterHint(error: unknown): number | undefined {
  const err = error as { response?: { data?: { retry_after_ms?: unknown } } };
  const raw = err?.response?.data?.retry_after_ms;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryWithBackoffOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    shouldRetry = defaultShouldRetry,
    getRetryAfterHint = defaultGetRetryAfterHint,
    onRetry,
  } = opts;

  let lastError: unknown;
  const totalAttempts = Math.max(1, maxRetries + 1);

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const retriesRemaining = totalAttempts - attempt - 1;

      if (retriesRemaining <= 0 || !shouldRetry(err, attempt)) {
        throw err;
      }

      const retryAfterHint = attempt === 0 ? getRetryAfterHint(err) : undefined;
      const exponentialDelay = baseDelayMs * 2 ** attempt;
      const delayMs =
        retryAfterHint && retryAfterHint > exponentialDelay ? retryAfterHint : exponentialDelay;

      onRetry?.(err, attempt, delayMs);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
