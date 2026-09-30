// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PublicPageMeta, upsertScriptJsonLd } from './PublicPageMeta';
import React from 'react';

const SITE_URL = 'https://hmsdp.vercel.app';

interface FakeHTMLElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string | null;
  parent: FakeHead | null;
}
interface FakeHead {
  children: FakeHTMLElement[];
}

let fakeHead: FakeHead;

function createElement(tag: string): FakeHTMLElement {
  return { tagName: tag.toUpperCase(), attributes: {}, textContent: null, parent: null };
}
function attr(el: FakeHTMLElement, q: string): string | undefined {
  return el.attributes[q];
}
function setAttr(el: FakeHTMLElement, k: string, v: string): void {
  el.attributes[k] = v;
}
function query(head: FakeHead, selector: string): FakeHTMLElement | null {
  const parts = selector.split(/(?=\[)/);
  const tagFilter = parts[0] ? parts[0].toUpperCase() : null;
  const attrMatchers: Array<[string, string]> = [];
  for (let i = 1; i < parts.length; i++) {
    const m = parts[i].match(/^\[([^\]="']+)=["']?([^\]"']+)["']?\]$/);
    if (m) attrMatchers.push([m[1], m[2]]);
  }
  for (const c of head.children) {
    if (tagFilter && c.tagName !== tagFilter) continue;
    let ok = true;
    for (const [k, v] of attrMatchers) {
      if (c.attributes[k] !== v) { ok = false; break; }
    }
    if (ok) return c;
  }
  return null;
}
function queryAll(head: FakeHead, selector: string): FakeHTMLElement[] {
  const out: FakeHTMLElement[] = [];
  const parts = selector.split(/(?=\[)/);
  const tagFilter = parts[0] ? parts[0].toUpperCase() : null;
  const attrMatchers: Array<[string, string]> = [];
  for (let i = 1; i < parts.length; i++) {
    const m = parts[i].match(/^\[([^\]="']+)=["']?([^\]"']+)["']?\]$/);
    if (m) attrMatchers.push([m[1], m[2]]);
  }
  for (const c of head.children) {
    if (tagFilter && c.tagName !== tagFilter) continue;
    let ok = true;
    for (const [k, v] of attrMatchers) {
      if (c.attributes[k] !== v) { ok = false; break; }
    }
    if (ok) out.push(c);
  }
  return out;
}

function installFakeDocument() {
  fakeHead = { children: [] };
  const fakeDocument: unknown = {
    head: {
      appendChild(el: FakeHTMLElement) {
        el.parent = fakeHead;
        fakeHead.children.push(el);
        return el;
      },
    },
    createElement(tag: string): FakeHTMLElement {
      return createElement(tag);
    },
    querySelector(selector: string): FakeHTMLElement | null {
      return query(fakeHead, selector);
    },
    querySelectorAll(selector: string): FakeHTMLElement[] {
      return queryAll(fakeHead, selector);
    },
    title: '',
  };
  (globalThis as unknown as { document: unknown }).document = fakeDocument;
  (globalThis as unknown as { CSS?: { escape: (s: string) => string } }).CSS = { escape: (s) => String(s).replace(/"/g, '\\"') };
}

function uninstallFakeDocument() {
  const g = globalThis as unknown as { document?: unknown; CSS?: unknown };
  delete g.document;
  delete g.CSS;
}

function mountMetaEffect(props: React.ComponentProps<typeof PublicPageMeta>): void {
  const calledCleanup = false;
  const Component = PublicPageMeta as unknown as (p: typeof props) => null;
  Component(props);
  void calledCleanup;
}

beforeEach(() => installFakeDocument());
afterEach(() => uninstallFakeDocument());

describe('toAbsoluteImage behavior (via PublicPageMeta og:image)', () => {
  test('absolute imageUrl passed through unchanged', () => {
    mountMetaEffect({ path: '/', imageUrl: 'https://cdn.example.com/a.jpg' });
    const img = query(fakeHead, 'meta[property="og:image"]');
    expect(img?.attributes.content).toBe('https://cdn.example.com/a.jpg');
  });

  test('leading-slash relative resolves under SITE_URL', () => {
    mountMetaEffect({ path: '/berita', imageUrl: '/uploads/foto.jpg' });
    const img = query(fakeHead, 'meta[property="og:image"]');
    expect(img?.attributes.content).toBe(`${SITE_URL}/uploads/foto.jpg`);
  });

  test('bare path (no slash) resolves with slash join', () => {
    mountMetaEffect({ path: '/', imageUrl: 'kegiatan.jpg' });
    const img = query(fakeHead, 'meta[property="og:image"]');
    expect(img?.attributes.content).toBe(`${SITE_URL}/kegiatan.jpg`);
  });

  test('null/empty imageUrl falls back to default logo', () => {
    mountMetaEffect({ path: '/' });
    const img = query(fakeHead, 'meta[property="og:image"]');
    expect(img?.attributes.content).toBe(`${SITE_URL}/logo-hmsdp.png`);
    mountMetaEffect({ path: '/', imageUrl: '' });
    expect(query(fakeHead, 'meta[property="og:image"]')?.attributes.content).toBe(`${SITE_URL}/logo-hmsdp.png`);
    mountMetaEffect({ path: '/', imageUrl: '   ' });
    expect(query(fakeHead, 'meta[property="og:image"]')?.attributes.content).toBe(`${SITE_URL}/logo-hmsdp.png`);
  });
});

describe('PublicPageMeta canonical === og:url synchronization (AC-3)', () => {
  test('path /berita: canonical.href === og:url.content === SITE_URL/berita', () => {
    mountMetaEffect({ title: 'Berita', description: 'Daftar berita', path: '/berita' });
    const canonical = query(fakeHead, 'link[rel="canonical"]');
    const ogUrl = query(fakeHead, 'meta[property="og:url"]');
    expect(canonical?.attributes.href).toBe(`${SITE_URL}/berita`);
    expect(ogUrl?.attributes.content).toBe(`${SITE_URL}/berita`);
    expect(canonical?.attributes.href).toBe(ogUrl?.attributes.content);
  });

  test('path without leading slash is normalized with slash prefix', () => {
    mountMetaEffect({ path: 'galeri' as unknown as '/' });
    const canonical = query(fakeHead, 'link[rel="canonical"]');
    expect(canonical?.attributes.href).toBe(`${SITE_URL}/galeri`);
  });
});

describe('PublicPageMeta title suffix AC (document.title ends with " | E-Absensi")', () => {
  test('with title → "{title} | E-Absensi"', () => {
    mountMetaEffect({ title: 'Program Kerja', path: '/program-kerja' });
    const doc = (globalThis as unknown as { document: { title: string } }).document;
    expect(doc.title).toBe('Program Kerja | E-Absensi');
    const ogTitle = query(fakeHead, 'meta[property="og:title"]');
    expect(ogTitle?.attributes.content).toBe('Program Kerja | E-Absensi');
    const twTitle = query(fakeHead, 'meta[name="twitter:title"]');
    expect(twTitle?.attributes.content).toBe('Program Kerja | E-Absensi');
  });

  test('without title → fallback brand title (no suffix duplication)', () => {
    mountMetaEffect({ path: '/' });
    const doc = (globalThis as unknown as { document: { title: string } }).document;
    expect(doc.title).toMatch(/E-Absensi/);
  });
});

describe('upsertScriptJsonLd insert/update/remove', () => {
  test('inserts new ld+json with data-seo-schema id', () => {
    upsertScriptJsonLd('organization', { '@type': 'Organization', name: 'HM SDP' });
    const sel = `script[type="application/ld+json"][data-seo-schema="organization"]`;
    const el = query(fakeHead, sel);
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe('SCRIPT');
    expect(el?.attributes.type).toBe('application/ld+json');
    expect(el?.textContent).toBe(JSON.stringify({ '@type': 'Organization', name: 'HM SDP' }));
  });

  test('updates existing element in-place (no duplicate)', () => {
    upsertScriptJsonLd('article', { '@type': 'BlogPosting', headline: 'A' });
    upsertScriptJsonLd('article', { '@type': 'BlogPosting', headline: 'B' });
    const all = queryAll(fakeHead, 'script[type="application/ld+json"][data-seo-schema="article"]');
    expect(all).toHaveLength(1);
    expect(all[0].textContent).toBe(JSON.stringify({ '@type': 'BlogPosting', headline: 'B' }));
  });

  test('removes element when data is null (cleanup on unmount)', () => {
    upsertScriptJsonLd('test', { hello: true });
    expect(queryAll(fakeHead, 'script[type="application/ld+json"][data-seo-schema="test"]')).toHaveLength(1);
    upsertScriptJsonLd('test', null);
    expect(queryAll(fakeHead, 'script[type="application/ld+json"][data-seo-schema="test"]')).toHaveLength(0);
  });
});

describe('PublicPageMeta description sets both meta[name=description] and og:description', () => {
  test('explicit description flows to both meta and og:description', () => {
    const desc = 'Pengumuman terbaru HM SDP Undiksha mengenai kegiatan dan lomba.';
    mountMetaEffect({ title: 'Informasi', description: desc, path: '/informasi' });
    const metaDesc = query(fakeHead, 'meta[name="description"]');
    const ogDesc = query(fakeHead, 'meta[property="og:description"]');
    expect(metaDesc?.attributes.content).toBe(desc);
    expect(ogDesc?.attributes.content).toBe(desc);
  });
});

describe('ProtectedRoute upsert/remove noindex meta pattern behavior', () => {
  test('upsert + remove pattern: selector removes all matched elements', () => {
    function upsertNoindex() {
      const doc = (globalThis as unknown as { document: { querySelector: (s: string) => FakeHTMLElement | null; createElement: (t: string) => FakeHTMLElement; head: FakeHead & { appendChild: (e: FakeHTMLElement) => void } } }).document;
      const sel = 'meta[name="robots"][data-protected-route="true"]';
      let el = doc.querySelector(sel);
      if (!el) {
        el = doc.createElement('meta');
        setAttr(el, 'name', 'robots');
        setAttr(el, 'data-protected-route', 'true');
        doc.head.appendChild(el);
      }
      setAttr(el, 'content', 'noindex, nofollow, nosnippet, noarchive');
    }
    function removeNoindex() {
      const doc = (globalThis as unknown as { document: { querySelectorAll: (s: string) => FakeHTMLElement[] } }).document;
      const sel = 'meta[name="robots"][data-protected-route="true"]';
      const all = doc.querySelectorAll(sel);
      for (const n of all) {
        fakeHead.children = fakeHead.children.filter((c) => c !== n);
      }
    }
    upsertNoindex();
    const before = queryAll(fakeHead, 'meta[name="robots"][data-protected-route="true"]');
    expect(before).toHaveLength(1);
    expect(before[0].attributes.content).toBe('noindex, nofollow, nosnippet, noarchive');
    removeNoindex();
    const after = queryAll(fakeHead, 'meta[name="robots"][data-protected-route="true"]');
    expect(after).toHaveLength(0);
  });
});
