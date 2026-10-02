import crypto from 'crypto';

/** Rotasi QR dinamis — selaras dengan interval tampilan (15 detik) */
export const QR_WINDOW_MS = 15_000;

/**
 * Grace check-in: cold start Vercel + upload selfie.
 * Age is measured from the bucket start (not capture instant), so usable
 * wall-clock time varies ±QR_WINDOW_MS (~15s) by design — intentional
 * anti-replay bound; do not "fix" by anchoring to capture time.
 */
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

export function buildDynamicQrToken(
  sessionId: string,
  secret: string,
  nowMs: number = Date.now()
): string {
  const bucketTimestamp = getQrBucketTimestamp(nowMs);
  const payload = buildDynamicQrPayload(sessionId, bucketTimestamp);
  const signature = signDynamicQrPayload(payload, secret);
  return `${payload}:${signature}`;
}

export type DynamicQrValidationResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Validate the signed timestamp and enforce the upload grace period.
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

  const scannedTimestamp = Number(scannedTimestampStr);
  if (
    !/^\d+$/.test(scannedTimestampStr) ||
    !Number.isSafeInteger(scannedTimestamp) ||
    scannedTimestamp < 0
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Format QR tidak valid. Pastikan Anda men-scan QR Dinamis yang benar.',
    };
  }

  const payload = buildDynamicQrPayload(scannedSessionId, scannedTimestamp);
  const expectedCurrent = signDynamicQrPayload(payload, secret);

  const sigBuf = Buffer.from(signature, 'utf8');
  let isCurrentValid = false;
  try {
    isCurrentValid =
      sigBuf.length === Buffer.byteLength(expectedCurrent, 'utf8') &&
      crypto.timingSafeEqual(sigBuf, Buffer.from(expectedCurrent, 'utf8'));
  } catch {
    return { ok: false, status: 400, error: 'QR Code tidak valid / dimanipulasi' };
  }

  if (!isCurrentValid) {
    return { ok: false, status: 400, error: 'QR Code tidak valid / dimanipulasi' };
  }

  const nowMs = now.getTime();
  const bucketAligned = scannedTimestamp % QR_WINDOW_MS === 0;
  const qrAgeMs = nowMs - scannedTimestamp;
  if (!bucketAligned || qrAgeMs < 0 || qrAgeMs > QR_GRACE_MS) {
    return { ok: false, status: 400, error: 'QR Code sudah kedaluwarsa. Silakan scan ulang' };
  }

  return { ok: true };
}
