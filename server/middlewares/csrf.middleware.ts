import type { Request, Response, NextFunction } from 'express';
import { shouldSkipCsrfPath } from '../constants/internalRoutes.js';

function isSafeMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  if (isSafeMethod(req.method)) {
    next();
    return;
  }

  const pathname = req.path || '';
  if (shouldSkipCsrfPath(pathname)) {
    next();
    return;
  }

  const csrfCookie = (req as any).cookies?.csrfToken as string | undefined;
  const csrfHeader = (req.headers['x-csrf-token'] as string | undefined) ?? undefined;

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ success: false, error: 'CSRF validation failed' });
    return;
  }

  next();
}
