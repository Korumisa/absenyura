import { describe, expect, test } from 'vitest';
import { sanitizeWebUrl } from './sanitizeUrl.js';

describe('sanitizeWebUrl', () => {
  test('allows https URLs', () => {
    expect(sanitizeWebUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  test('upgrades http to https', () => {
    expect(sanitizeWebUrl('http://example.com')).toBe('https://example.com/');
  });

  test('rejects javascript URLs', () => {
    expect(sanitizeWebUrl('javascript:alert(1)')).toBeNull();
  });

  test('rejects empty input', () => {
    expect(sanitizeWebUrl('')).toBeNull();
    expect(sanitizeWebUrl(null)).toBeNull();
  });
});
