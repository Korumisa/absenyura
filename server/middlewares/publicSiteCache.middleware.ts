import type { Request, Response, NextFunction } from 'express';

/** Cache edge untuk GET konten publik — tidak dipakai pada route admin/auth */
export function publicSiteCache(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  next();
}
