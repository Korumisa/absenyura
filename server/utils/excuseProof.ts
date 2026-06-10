import crypto from 'crypto';
import { isTimingSafeMatch } from './attendanceValidation.js';

export const EXCUSE_PROOF_VERSION = 'v1';

export function getExcuseProofSecret(): string | null {
  const secret = process.env.EXCUSE_PROOF_SECRET || process.env.ATTENDANCE_PROOF_SECRET || null;
  return secret && secret.length >= 32 ? secret : null;
}

export function buildExcuseProofPayload(input: {
  userId: string;
  sessionId: string;
  photoSize: number;
  photoType: string;
  nonce: string;
  expiresAt: Date;
}): string {
  return [
    EXCUSE_PROOF_VERSION,
    input.userId,
    input.sessionId,
    String(input.photoSize),
    input.photoType,
    input.nonce,
    input.expiresAt.toISOString(),
  ].join(':');
}

export function signExcuseProof(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export { isTimingSafeMatch };
