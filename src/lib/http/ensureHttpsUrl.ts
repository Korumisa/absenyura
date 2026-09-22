export function ensureHttpsUrl(url: string | null | undefined) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return '';
  try {
    // Protocol-relative CDN URLs (//res.cloudinary.com/...)
    const normalized = raw.startsWith('//') ? `https:${raw}` : raw;
    // Site-relative uploads (/uploads/...) — resolve against current origin in browser
    const absolute =
      normalized.startsWith('/') && typeof window !== 'undefined'
        ? new URL(normalized, window.location.origin).toString()
        : normalized;
    const parsed = new URL(absolute);
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
