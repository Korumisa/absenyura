/** Transformasi Cloudinary untuk pengiriman gambar lebih ringan di halaman publik */
export function isCloudinaryUrl(url: string): boolean {
  return /res\.cloudinary\.com/i.test(url) && url.includes('/upload/');
}

export function optimizeCloudinaryUrl(
  url: string,
  opts?: { width?: number; quality?: 'auto' | number }
): string {
  if (!url || !isCloudinaryUrl(url)) return url;

  const parts = ['f_auto', 'q_auto'];
  if (opts?.width && opts.width > 0) parts.push(`w_${Math.round(opts.width)}`);
  if (typeof opts?.quality === 'number') {
    parts.push(`q_${Math.min(100, Math.max(40, Math.round(opts.quality)))}`);
  }

  const segment = parts.join(',');
  if (url.includes(`/upload/${segment}/`)) return url;
  return url.replace('/upload/', `/upload/${segment}/`);
}

export function buildCloudinarySrcSet(url: string, widths: number[]): string | undefined {
  if (!isCloudinaryUrl(url)) return undefined;
  const unique = [...new Set(widths.filter((w) => w > 0))].sort((a, b) => a - b);
  if (unique.length === 0) return undefined;
  return unique.map((w) => `${optimizeCloudinaryUrl(url, { width: w })} ${w}w`).join(', ');
}
