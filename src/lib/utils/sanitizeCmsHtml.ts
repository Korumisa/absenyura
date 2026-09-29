/** Lightweight HTML sanitize for public CMS rich text (no DOMPurify dependency). */
export function sanitizeCmsHtml(dirty: string | null | undefined): { __html: string } {
  if (!dirty) return { __html: '' };
  let cleaned = String(dirty);
  cleaned = cleaned.replace(/<(script|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  cleaned = cleaned.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  cleaned = cleaned.replace(/<a\s([^>]*)href="([^"]+)"([^>]*)>/gi, (_match, pre, href, post) => {
    const safeHref = /^https?:\/\//i.test(href) ? href : '#';
    return `<a ${pre} href="${safeHref}" ${post} target="_blank" rel="noopener noreferrer">`;
  });
  cleaned = cleaned.replace(/<a\s([^>]*)href='([^']+)'([^>]*)>/gi, (_match, pre, href, post) => {
    const safeHref = /^https?:\/\//i.test(href) ? href : '#';
    return `<a ${pre} href='${safeHref}' ${post} target="_blank" rel="noopener noreferrer">`;
  });
  return { __html: cleaned };
}

/** True when string looks like HTML markup rather than plain text. */
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}
