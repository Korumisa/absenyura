import { describe, expect, test } from 'vitest';
import { ensureHttpsUrl } from './ensureHttpsUrl';

describe('ensureHttpsUrl', () => {
  test('allows https and mailto', () => {
    expect(ensureHttpsUrl('https://example.com')).toBe('https://example.com/');
    expect(ensureHttpsUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  test('rejects javascript', () => {
    expect(ensureHttpsUrl('javascript:alert(1)')).toBe('');
  });
});
