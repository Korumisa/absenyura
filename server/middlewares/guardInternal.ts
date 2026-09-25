import { Request, Response, NextFunction } from 'express';
import { safeCompare } from '../utils/security.js';

function getInternalTokenFromRequest(req: Request): string | null {
  const token = Array.isArray(req.headers['x-internal-token'])
    ? req.headers['x-internal-token'][0]
    : req.headers['x-internal-token'];
  return token ? String(token) : null;
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

export const guardInternal = (req: Request, res: Response, next: NextFunction): void => {
  const token = getInternalTokenFromRequest(req);
  const expected = process.env.INTERNAL_SECRET;
  if (!token || !expected || !safeCompare(token, expected)) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  next();
};

/**
 * Keep-warm / ops health: accept INTERNAL_SECRET (x-internal-token) or
 * CRON_SECRET (Bearer / X-Cron-Secret) so Vercel Cron + GitHub Actions can ping DB.
 */
export const guardHealth = (req: Request, res: Response, next: NextFunction): void => {
  const internalExpected = process.env.INTERNAL_SECRET;
  const internalToken = getInternalTokenFromRequest(req);
  if (internalToken && internalExpected && safeCompare(internalToken, internalExpected)) {
    next();
    return;
  }

  const cronExpected = process.env.CRON_SECRET;
  const cronProvided = getCronSecretFromRequest(req);
  if (cronExpected && cronProvided && safeCompare(cronProvided, cronExpected)) {
    next();
    return;
  }

  res.status(404).json({ message: 'Not found' });
};

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
  if (!provided || !safeCompare(provided, expected)) {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  next();
};
