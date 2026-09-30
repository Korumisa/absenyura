// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { truncateText } from './utils';

describe('truncateText helper', () => {
  test('returns empty string for null/undefined/empty', () => {
    expect(truncateText(null, 20)).toBe('');
    expect(truncateText(undefined, 20)).toBe('');
    expect(truncateText('', 20)).toBe('');
    expect(truncateText('   ', 20)).toBe('');
  });

  test('returns original if length <= maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
    expect(truncateText('Hello world', 11)).toBe('Hello world');
  });

  test('normalizes whitespace (collapse + trim)', () => {
    expect(truncateText('  a   b  c  ', 10)).toBe('a b c');
    expect(truncateText('line1\n\nline2\t\ttab', 20)).toBe('line1 line2 tab');
  });

  test('truncates at word boundary when space index > 60% threshold', () => {
    const text = 'Sistem absensi berbasis web untuk organisasi kemahasiswaan';
    const result = truncateText(text, 30);
    expect(result.length).toBeLessThanOrEqual(31);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toMatch(/\S\S\S\S\S…$/);
  });

  test('hard-truncates if last space is too early (< 60%)', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ short ok';
    const result = truncateText(text, 25);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(26);
  });

  test('always appends ellipsis for long input (never bare slice)', () => {
    const long = 'a'.repeat(200);
    const out = truncateText(long, 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(51);
  });

  test('word-aware vs hard-cut: prefers whole word when possible', () => {
    const sentence = 'Pendaftaran open recruitment dibuka untuk seluruh mahasiswa';
    const out = truncateText(sentence, 42);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('seluruh');
    expect(out).toMatch(/[^…]…$/);
    expect(out.length).toBeLessThanOrEqual(43);
  });

  test('handles single non-space long token', () => {
    const token = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const out = truncateText(token, 18);
    expect(out).toBe('abcdefghijklmnopqr…');
    expect(out.length).toBe(19);
  });
});
