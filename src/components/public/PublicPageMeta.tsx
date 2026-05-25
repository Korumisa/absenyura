import { useEffect } from 'react';

const SITE_URL = 'https://hmsdp.vercel.app';
const DEFAULT_IMAGE = `${SITE_URL}/logo-hmsdp.png`;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content || typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function PublicPageMeta({
  title,
  description,
  path = '/',
}: {
  title?: string;
  description?: string;
  path?: string;
}) {
  useEffect(() => {
    const pageTitle = title ? `${title} | E-Absensi` : 'E-Absensi — Absensi & Portal HM SDP';
    const desc =
      description ||
      'Sistem absensi akademik dan portal informasi Himpunan Mahasiswa SDP Undiksha Denpasar.';

    document.title = pageTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', DEFAULT_IMAGE);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', DEFAULT_IMAGE);
  }, [title, description, path]);

  return null;
}
