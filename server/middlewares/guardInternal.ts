import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const guardInternal = (req: Request, res: Response, next: NextFunction): void => {
  const token = Array.isArray(req.headers['x-internal-token'])
    ? req.headers['x-internal-token'][0]
    : req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SECRET;
  if (!token || !expected || !safeCompare(String(token), expected)) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  next();
};

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getCronSecretFromRequest(req: Request): string | null {
  const headerSecret = Array.isArray(req.headers['x-cron-secret'])
    ? req.headers['x-cron-secret'][0]
    : req.headers['x-cron-secret'];
  if (headerSecret) return String(headerSecret);

  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  if (authHeader) {
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

export const guardCron = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.warn('[Cron] CRON_SECRET tidak diset; cron eksternal ditolak');
    }
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const provided = getCronSecretFromRequest(req);
  if (!provided || !timingSafeEqualStrings(provided, expected)) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  next();
};
