/**
 * Memetakan field_errors / errors dari respons API (400 atau 422) ke form.
 */
/** Memetakan field_errors / errors dari respons API; mengembalikan map jika berhasil. */
export function applyApiFieldErrors(
  err: unknown,
  setFormErrors: (errors: Record<string, string>) => void
): Record<string, string> | null {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data || (status !== 400 && status !== 422)) return null;

  const raw = (data.field_errors ?? data.errors) as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return null;

  const mapped: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const msg = Array.isArray(val) ? val[0] : typeof val === 'string' ? val : null;
    if (msg) mapped[key] = String(msg);
  }
  if (Object.keys(mapped).length === 0) return null;
  setFormErrors(mapped);
  return mapped;
}

export function firstFieldErrorMessage(errors: Record<string, string>): string | null {
  const values = Object.values(errors);
  return values.length > 0 ? values[0] : null;
}
