import type { Request, Response, NextFunction } from 'express';

/**
 * Logs slow API requests to Vercel Runtime Logs (no third-party cost).
 */
export function requestTiming(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 1000) {
      console.warn(`[SLOW] ${req.method} ${req.path} ${ms}ms ${res.statusCode}`);
    }
  });

  next();
}
