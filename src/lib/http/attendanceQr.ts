export function parseAttendanceQr(raw: string, expectedSessionId: string | null) {
  let sessionId = expectedSessionId;
  let token = raw.trim();
  try {
    if (/^https?:\/\//i.test(token) || token.startsWith('/attend?')) {
      const url = new URL(token, 'https://attendance.invalid');
      sessionId = url.searchParams.get('session');
      token = url.searchParams.get('token')?.trim() || '';
    } else if (token.split(':').length === 3) {
      sessionId = token.split(':')[0];
    }
  } catch {
    return null;
  }
  if (!sessionId || !token || token === sessionId || token === 'NO_QR_REQUIRED') return null;
  if (expectedSessionId && expectedSessionId !== sessionId) return null;
  return { sessionId, token };
}
