export function ensureHttpsUrl(url: string | null | undefined) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return '';
  if (raw.startsWith('http://')) return `https://${raw.slice('http://'.length)}`;
  return raw;
}

