/** Normalisasi URL embed video (YouTube, TikTok, Instagram) untuk iframe */
export function normalizeYoutubeEmbedUrl(input: string) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  if (raw.includes('tiktok.com/embed')) return raw.startsWith('http://') ? raw.replace(/^http:\/\//, 'https://') : raw;
  if (raw.includes('instagram.com') && raw.includes('/embed')) return raw.startsWith('http://') ? raw.replace(/^http:\/\//, 'https://') : raw;
  if (raw.includes('youtube.com/embed/') || raw.includes('youtube-nocookie.com/embed/')) return raw;
  const directId = raw.match(/^[a-zA-Z0-9_-]{6,}$/)?.[0];
  if (directId) return `https://www.youtube.com/embed/${directId}`;
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';
    if (host.endsWith('tiktok.com')) {
      const m = url.pathname.match(/\/video\/(\d+)/);
      const vid = m?.[1] || '';
      if (vid) return `https://www.tiktok.com/embed/v2/${vid}`;
      const embed = url.pathname.match(/\/embed\/v2\/(\d+)/)?.[1] || url.pathname.match(/\/embed\/(\d+)/)?.[1] || '';
      if (embed) return `https://www.tiktok.com/embed/v2/${embed}`;
      return '';
    }
    if (host.endsWith('instagram.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const kind = parts[0] || '';
      const code = parts[1] || '';
      if (!kind || !code) return '';
      if (kind !== 'p' && kind !== 'reel' && kind !== 'tv') return '';
      return `https://www.instagram.com/${kind}/${code}/embed/`;
    }
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    if (host.endsWith('youtube.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] || '';
      else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || '';
      else if (url.pathname.startsWith('/live/')) id = url.pathname.split('/')[2] || '';
    }
    id = id.trim();
    if (!id) return '';
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return '';
  }
}
