// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PublicPageMeta, upsertScriptJsonLd } from './PublicPageMeta';

const SITE_URL = 'https://hmsdp.vercel.app';
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom does not implement CSS.escape; these tests use identifier-only schema IDs.
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  document.head.innerHTML = '';
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  vi.unstubAllGlobals();
});

function renderMeta(props: React.ComponentProps<typeof PublicPageMeta>) {
  act(() => root.render(<PublicPageMeta {...props} />));
}

function content(selector: string) {
  return document.querySelector(selector)?.getAttribute('content');
}

describe('PublicPageMeta', () => {
  test.each([
    ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/a.jpg'],
    ['/uploads/foto.jpg', `${SITE_URL}/uploads/foto.jpg`],
    ['kegiatan.jpg', `${SITE_URL}/kegiatan.jpg`],
    [undefined, `${SITE_URL}/logo-hmsdp.png`],
    ['', `${SITE_URL}/logo-hmsdp.png`],
    ['   ', `${SITE_URL}/logo-hmsdp.png`],
  ])('normalizes image %s', (imageUrl, expected) => {
    renderMeta({ path: '/', imageUrl });
    expect(content('meta[property="og:image"]')).toBe(expected);
    expect(content('meta[name="twitter:image"]')).toBe(expected);
  });

  test.each(['/berita', 'galeri'])('synchronizes canonical and og:url for %s', (path) => {
    renderMeta({ path });
    const expected = `${SITE_URL}/${path.replace(/^\//, '')}`;
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(expected);
    expect(content('meta[property="og:url"]')).toBe(expected);
  });

  test('updates metadata when the page changes without duplicate tags', () => {
    renderMeta({ title: 'Berita', path: '/berita' });
    renderMeta({ title: 'Galeri', description: 'Foto kegiatan', path: '/galeri' });
    expect(document.title).toBe('Galeri | E-Absensi');
    expect(content('meta[property="og:title"]')).toBe(document.title);
    expect(content('meta[name="twitter:title"]')).toBe(document.title);
    expect(content('meta[name="description"]')).toBe('Foto kegiatan');
    expect(content('meta[property="og:description"]')).toBe('Foto kegiatan');
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
  });

  test('uses the brand title when no title is provided', () => {
    renderMeta({});
    expect(document.title).toContain('E-Absensi');
  });
});

describe('upsertScriptJsonLd', () => {
  test('inserts and updates the same schema element', () => {
    upsertScriptJsonLd('article', { '@type': 'BlogPosting', headline: 'A' });
    upsertScriptJsonLd('article', { '@type': 'BlogPosting', headline: 'B' });
    const elements = document.querySelectorAll(
      'script[type="application/ld+json"][data-seo-schema="article"]'
    );
    expect(elements).toHaveLength(1);
    expect(JSON.parse(elements[0].textContent!)).toEqual({
      '@type': 'BlogPosting',
      headline: 'B',
    });
  });

  test('removes only the requested schema', () => {
    upsertScriptJsonLd('article', { headline: 'A' });
    upsertScriptJsonLd('organization', { name: 'HM SDP' });
    upsertScriptJsonLd('article', null);
    expect(document.querySelector('[data-seo-schema="article"]')).toBeNull();
    expect(document.querySelector('[data-seo-schema="organization"]')).not.toBeNull();
  });
});
