import type { Request, Response, NextFunction } from 'express';

/**
 * Edge-cache successful public GETs only.
 * Never cache 4xx/5xx — a brief DB blip was being CDN-cached as 503 for
 * `/api/public-site/structure` (responses returned in ~3ms from the edge).
 */
export function publicSiteCache(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  (res as Response).json = ((body: unknown) => {
    const code = res.statusCode || 200;
    if (code >= 200 && code < 300) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('CDN-Cache-Control', 'no-store');
      res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    }
    return originalJson(body);
  }) as Response['json'];
  next();
}
