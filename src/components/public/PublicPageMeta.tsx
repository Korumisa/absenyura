import { useEffect } from 'react';

const SITE_URL = 'https://hmsdp.vercel.app';
const DEFAULT_IMAGE = `${SITE_URL}/logo-hmsdp.png`;

function toAbsoluteImage(maybeRelative: string | null | undefined): string {
  if (!maybeRelative) return DEFAULT_IMAGE;
  const trimmed = String(maybeRelative).trim();
  if (!trimmed) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${SITE_URL}${trimmed}`;
  return `${SITE_URL}/${trimmed}`;
}

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

function upsertLink(rel: string, href: string) {
  if (!href || typeof document === 'undefined') return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function upsertScriptJsonLd<T extends object>(id: string, data: T | null) {
  if (typeof document === 'undefined') return;
  const selector = `script[type="application/ld+json"][data-seo-schema="${CSS.escape(id)}"]`;
  let el = document.querySelector(selector) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo-schema', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function PublicPageMeta({
  title,
  description,
  path = '/',
  imageUrl,
}: {
  title?: string;
  description?: string;
  path?: string;
  imageUrl?: string;
}) {
  useEffect(() => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const canonicalUrl = `${SITE_URL}${normalizedPath}`;
    const pageTitle = title ? `${title} | E-Absensi` : 'E-Absensi — Absensi & Portal HM SDP';
    const desc =
      description ||
      'Sistem absensi akademik dan portal informasi Himpunan Mahasiswa SDP Undiksha Denpasar.';
    const absoluteImage = toAbsoluteImage(imageUrl);

    document.title = pageTitle;
    upsertLink('canonical', canonicalUrl);
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', absoluteImage);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', absoluteImage);
  }, [title, description, path, imageUrl]);

  return null;
}
