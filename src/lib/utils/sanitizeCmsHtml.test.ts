// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeCmsHtml, looksLikeHtml } from './sanitizeCmsHtml.js';

describe('sanitizeCmsHtml - DOMPurify upgrade (XSS bypass regex removed)', () => {
  it('menghapus inline onerror handler unquoted attribute (regex only gagal ini)', () => {
    const input = `<p>halo <img src=x onerror=alert(document.domain)></p>`;
    const res = sanitizeCmsHtml(input);
    expect(res.__html).not.toContain('onerror');
    expect(res.__html).not.toContain('alert(');
    expect(res.__html).toContain('<p>halo <img');
  });

  it('menghapus href javascript: scheme (regex original hanya accept http tapi tidak DENY)', () => {
    const input = `<a href="javascript:alert(1)">click evil</a>`;
    const res = sanitizeCmsHtml(input);
    expect(res.__html).not.toContain('javascript:');
    expect(res.__html).not.toContain('alert(');
  });

  it('menghapus iframe arbitrary src (script regex tidak menutupi ini)', () => {
    const input = `<p><iframe src="https://evil.com/steal" width=500 height=500></iframe></p>`;
    const res = sanitizeCmsHtml(input);
    expect(res.__html).not.toContain('<iframe');
    expect(res.__html).not.toContain('evil.com');
  });

  it('tetap memperbolehkan tags benigna: strong, link https, em (DOMPurify mungkin tambahkan rel atau reorder attr)', () => {
    const input = `<p>text <strong>bold</strong> <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a> <em>miring</em></p>`;
    const res = sanitizeCmsHtml(input);
    expect(res.__html).toContain('bold');
    expect(res.__html).toContain('miring');
    expect(res.__html).toContain('href="https://example.com"'); // link tetap survive
    expect(res.__html).toContain('<p>text');
  });
});

describe('looksLikeHtml - helper detection', () => {
  it('true untuk markup tags', () => expect(looksLikeHtml('<p>a</p>')).toBe(true));
  it('false untuk plain text', () => expect(looksLikeHtml('hello world')).toBe(false));
  it('false untuk null/undefined/empty', () => {
    expect(looksLikeHtml(null)).toBe(false);
    expect(looksLikeHtml(undefined)).toBe(false);
    expect(looksLikeHtml('')).toBe(false);
  });
});
