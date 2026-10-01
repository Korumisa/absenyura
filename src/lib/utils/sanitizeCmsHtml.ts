import DOMPurify from 'dompurify';

let purifyInstance: { sanitize: (dirty: string) => string } | null = null;

function getPurify(): { sanitize: (dirty: string) => string } {
  if (purifyInstance) return purifyInstance;
  if (
    typeof (DOMPurify as unknown as { sanitize?: (s: string) => string }).sanitize === 'function'
  ) {
    purifyInstance = DOMPurify as unknown as { sanitize: (s: string) => string };
  } else if (typeof window !== 'undefined') {
    const factory = DOMPurify as unknown as (w: Window) => { sanitize: (s: string) => string };
    purifyInstance = factory(window);
  } else {
    throw new Error(
      'DOMPurify membutuhkan global window (browser atau test dengan @vitest-environment jsdom)'
    );
  }
  return purifyInstance;
}

/** DOMPurify-based CMS sanitizer — menghilangkan seluruh regex-only bypass XSS di original L1-L23 */
export function sanitizeCmsHtml(dirty: string | null | undefined): { __html: string } {
  if (!dirty) return { __html: '' };
  return { __html: getPurify().sanitize(dirty) };
}

/** True when string contains HTML markup (bukan plain text) */
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}
