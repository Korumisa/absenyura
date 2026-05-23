import { describe, expect, it } from 'vitest';
import {
  buildDynamicQrToken,
  getQrBucketTimestamp,
  QR_GRACE_MS,
  QR_WINDOW_MS,
  validateDynamicQrToken,
} from './dynamicQr.js';

describe('dynamicQr', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const secret = 'test-secret';

  it('generates identical tokens within the same 15s bucket', () => {
    const bucket = getQrBucketTimestamp(1_700_000_000_123);
    const t1 = buildDynamicQrToken(sessionId, secret, bucket + 1000);
    const t2 = buildDynamicQrToken(sessionId, secret, bucket + 8000);
    expect(t1).toBe(t2);
  });

  it('accepts token from previous bucket within grace', () => {
    const nowMs = getQrBucketTimestamp(90_000) + QR_WINDOW_MS + 1_000;
    const prevBucket = getQrBucketTimestamp(nowMs) - QR_WINDOW_MS;
    const token = buildDynamicQrToken(sessionId, secret, prevBucket);
    const result = validateDynamicQrToken(sessionId, secret, token, new Date(nowMs));
    expect(result.ok).toBe(true);
  });

  it('rejects token older than grace period', () => {
    const scannedAt = getQrBucketTimestamp(Date.now() - QR_GRACE_MS - QR_WINDOW_MS);
    const token = buildDynamicQrToken(sessionId, secret, scannedAt);
    const result = validateDynamicQrToken(sessionId, secret, token, new Date());
    expect(result.ok).toBe(false);
  });
});
