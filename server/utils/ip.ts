export function normalizeIp(rawIp: string | undefined): string {
  if (!rawIp) return 'unknown';
  const stripped = rawIp.trim().replace(/^::ffff:/i, '');
  return stripped === '::1' ? '127.0.0.1' : stripped;
}
