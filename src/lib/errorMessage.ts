export function getErrorMessage(err: any, fallback: string) {
  const value =
    err?.response?.data?.error ??
    err?.response?.data?.message ??
    err?.message ??
    err;

  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const msg = (value as any).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

