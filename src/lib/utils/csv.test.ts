import { describe, expect, test } from 'vitest';
import { escapeCsv } from './csv';

describe('escapeCsv', () => {
  test('neutralizes leading formula characters', () => {
    expect(escapeCsv('=HYPERLINK("https://evil.example")')).toBe(
      `"'=HYPERLINK(""https://evil.example"")"`
    );
    expect(escapeCsv('+cmd')).toBe("'+cmd");
    expect(escapeCsv('-2+3')).toBe("'-2+3");
    expect(escapeCsv('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  test('quotes commas and double-quotes after neutralization', () => {
    expect(escapeCsv('hello, world')).toBe('"hello, world"');
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsv('=1,2')).toBe(`"'=1,2"`);
  });

  test('collapses newlines and leaves safe text alone', () => {
    expect(escapeCsv('line1\nline2')).toBe('line1 line2');
    expect(escapeCsv('aman')).toBe('aman');
    expect(escapeCsv(null)).toBe('');
  });
});
