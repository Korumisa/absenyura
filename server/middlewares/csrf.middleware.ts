import type { Request, Response, NextFunction } from 'express';

function isSafeMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

function shouldSkipPath(pathname: string): boolean {
  if (pathname === '/api/auth/login') return true;
  if (pathname === '/api/auth/refresh') return true;
  if (pathname === '/api/auth/seed') return true;
  if (pathname === '/api/auth/flush-db') return true;
  if (pathname === '/api/health') return true;
  return false;
}

export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  if (isSafeMethod(req.method)) {
    next();
    return;
  }

  const pathname = req.path || '';
  if (shouldSkipPath(pathname)) {
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

