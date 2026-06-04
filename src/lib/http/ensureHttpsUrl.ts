export function ensureHttpsUrl(url: string | null | undefined) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
    if (['https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return parsed.toString();
    return '';
  } catch {
    return '';
  }
}
