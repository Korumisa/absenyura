import { isTimingSafeMatch } from './attendanceValidation.js';
import { validateDynamicQrToken } from './dynamicQr.js';

export function validateSessionQr(
  session: { id: string; qr_mode: string; qr_token: string | null; qr_secret: string | null },
  token: unknown,
  now = new Date()
): { ok: true } | { ok: false; status: number; error: string } {
  if (typeof token !== 'string' || !token.trim()) {
    return { ok: false, status: 400, error: 'Token QR diperlukan. Silakan pindai QR dari dosen.' };
  }
  if (session.qr_mode === 'DYNAMIC' && session.qr_secret) {
    return validateDynamicQrToken(session.id, session.qr_secret, token, now);
  }
  if (session.qr_mode === 'STATIC' && session.qr_token) {
    return isTimingSafeMatch(token.trim(), session.qr_token)
      ? { ok: true }
      : { ok: false, status: 400, error: 'Token QR statis tidak valid' };
  }
  return { ok: false, status: 400, error: 'QR sesi belum tersedia. Hubungi dosen.' };
}
