import { ensureHttpsUrl } from '../http/ensureHttpsUrl';
import type { PublicPost } from '../../types/publicSite';

const GUIDE_HINT =
  /guide\s*book|guidebook|panduan|juknis|petunjuk\s*teknis|rule\s*book|rulebook|pedoman|dokumen\s*lomba/i;

const FORM_HINT =
  /forms?\.gle|forms\.office|typeform\.com|google\.com\/forms|bit\.ly\/form|daftar|registr/i;

function extractFirstUrl(text: string) {
  const m = text.match(/https?:\/\/[^\s)"'<>]+/i);
  return m ? m[0] : null;
}

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)"'<>]+/gi)].map((m) => m[0]);
}

/** URL pendaftaran (form_url, atau URL form di konten/excerpt). */
export function getJoinUrl(p: PublicPost) {
  const direct = ensureHttpsUrl(p.form_url);
  if (direct) return direct;

  const haystacks = [p.content, p.excerpt].filter(Boolean).map(String);
  for (const raw of haystacks) {
    for (const url of extractUrls(raw)) {
      const safe = ensureHttpsUrl(url);
      if (!safe) continue;
      if (FORM_HINT.test(safe) || FORM_HINT.test(raw)) return safe;
    }
  }
  return null;
}

/**
 * Cari tautan guidebook/juknis dari konten HTML atau teks.
 * Mencocokkan teks tautan / URL yang mengandung kata panduan, guidebook, juknis, dll.
 */
export function getGuidebookUrl(p: PublicPost): string | null {
  const join = getJoinUrl(p);
  const html = String(p.content ?? '');
  const linkRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html))) {
    const href = ensureHttpsUrl(match[1]);
    const label = String(match[2] || '')
      .replace(/<[^>]+>/g, ' ')
      .trim();
    if (!href) continue;
    if (join && href === join) continue;
    if (GUIDE_HINT.test(label) || GUIDE_HINT.test(href)) return href;
    if (/\.pdf(\?|#|$)/i.test(href) || /drive\.google|docs\.google|dropbox\.com/i.test(href)) {
      return href;
    }
  }

  // Plain-text fallback: URL diikuti label guidebook di baris yang sama / sebaliknya
  const plain = html.replace(/<[^>]+>/g, ' ');
  const lines = plain.split(/\n+/);
  for (const line of lines) {
    if (!GUIDE_HINT.test(line)) continue;
    const url = ensureHttpsUrl(extractFirstUrl(line));
    if (url && url !== join) return url;
  }

  return null;
}
