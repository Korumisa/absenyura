/**
 * Escape a value for CSV and neutralize spreadsheet formula injection.
 * Prefixes cells that start with = + - @ tab or CR with a single quote
 * before quote/comma escaping, so Excel/Sheets treat them as text.
 */
export function escapeCsv(value: unknown): string {
  const raw = String(value ?? '');
  let normalized = raw.replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@\t\r]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
