import crypto from 'crypto';

/** Rotasi QR dinamis — selaras dengan interval tampilan (15 detik) */
export const QR_WINDOW_MS = 15_000;

/** Grace check-in: cold start Vercel + upload selfie */
export const QR_GRACE_MS = 90_000;

export function getQrBucketTimestamp(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / QR_WINDOW_MS) * QR_WINDOW_MS;
}

export function buildDynamicQrPayload(sessionId: string, bucketTimestamp: number): string {
  return `${sessionId}:${bucketTimestamp}`;
}

export function signDynamicQrPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function buildDynamicQrToken(sessionId: string, secret: string, nowMs: number = Date.now()): string {
  const bucketTimestamp = getQrBucketTimestamp(nowMs);
  const payload = buildDynamicQrPayload(sessionId, bucketTimestamp);
  const signature = signDynamicQrPayload(payload, secret);
  return `${payload}:${signature}`;
}

export type DynamicQrValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Validasi token dinamis: HMAC + bucket saat ini/sebelumnya + batas umur.
 */
export function validateDynamicQrToken(
  sessionId: string,
  secret: string,
  qrToken: string,
  now: Date = new Date()
): DynamicQrValidationResult {
  const parts = qrToken.trim().split(':');
  if (parts.length !== 3) {
    return {
      ok: false,
      status: 400,
      error: 'Format QR tidak valid. Pastikan Anda men-scan QR Dinamis yang benar.',
    };
  }

  const [scannedSessionId, scannedTimestampStr, signature] = parts;

  if (scannedSessionId !== sessionId) {
    return { ok: false, status: 400, error: 'QR bukan untuk sesi ini' };
  }

  const scannedTimestamp = parseInt(scannedTimestampStr, 10);
  if (!Number.isFinite(scannedTimestamp) || scannedTimestamp < 0) {
    return { ok: false, status: 400, error: 'Format QR tidak valid. Pastikan Anda men-scan QR Dinamis yang benar.' };
  }

  const payload = buildDynamicQrPayload(scannedSessionId, scannedTimestamp);
  const prevTimestamp = scannedTimestamp - QR_WINDOW_MS;
  const prevPayload = buildDynamicQrPayload(scannedSessionId, prevTimestamp);

  const expectedCurrent = signDynamicQrPayload(payload, secret);
  const expectedPrev = signDynamicQrPayload(prevPayload, secret);

  const sigBuf = Buffer.from(signature, 'utf8');
  let isCurrentValid = false;
  let isPrevValid = false;
  try {
    isCurrentValid =
      sigBuf.length === Buffer.byteLength(expectedCurrent, 'utf8') &&
      crypto.timingSafeEqual(sigBuf, Buffer.from(expectedCurrent, 'utf8'));
    isPrevValid =
      sigBuf.length === Buffer.byteLength(expectedPrev, 'utf8') &&
      crypto.timingSafeEqual(sigBuf, Buffer.from(expectedPrev, 'utf8'));
  } catch {
    return { ok: false, status: 400, error: 'QR Code tidak valid / dimanipulasi' };
  }

  if (!isCurrentValid && !isPrevValid) {
    return { ok: false, status: 400, error: 'QR Code tidak valid / dimanipulasi' };
  }

  const nowMs = now.getTime();
  const serverBucket = getQrBucketTimestamp(nowMs);
  const serverPrevBucket = serverBucket - QR_WINDOW_MS;

  // Toleransi satu window mundur: token dari bucket sebelumnya masih sah di awal window baru
  const bucketAligned = scannedTimestamp % QR_WINDOW_MS === 0;
  const inAllowedWindow =
    bucketAligned &&
    (scannedTimestamp === serverBucket || scannedTimestamp === serverPrevBucket);

  if (!inAllowedWindow) {
    return { ok: false, status: 400, error: 'QR Code sudah kedaluwarsa. Silakan scan ulang' };
  }

  const qrAgeMs = nowMs - scannedTimestamp;
  if (qrAgeMs > QR_GRACE_MS) {
    return { ok: false, status: 400, error: 'QR Code sudah kedaluwarsa. Silakan scan ulang' };
  }

  return { ok: true };
}
