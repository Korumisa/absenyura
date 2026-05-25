import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

export const guardInternal = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = Array.isArray(req.headers['x-internal-token'])
    ? req.headers['x-internal-token'][0]
    : req.headers['x-internal-token']
  if (!token || token !== process.env.INTERNAL_SECRET) {
    res.status(404).json({ message: 'Not found' })
    return
  }
  next()
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function getCronSecretFromRequest(req: Request): string | null {
  const headerSecret = Array.isArray(req.headers['x-cron-secret'])
    ? req.headers['x-cron-secret'][0]
    : req.headers['x-cron-secret']
  if (headerSecret) return String(headerSecret)

  const queryKey = req.query.key
  if (typeof queryKey === 'string') return queryKey
  if (Array.isArray(queryKey) && queryKey[0]) return String(queryKey[0])
  return null
}

export const guardCron = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.headers['x-vercel-cron'] === '1') {
    next()
    return
  }

  const expected = process.env.CRON_SECRET
  if (!expected) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.warn('[Cron] CRON_SECRET tidak diset; cron eksternal ditolak')
    }
    res.status(404).json({ message: 'Not found' })
    return
  }

  const provided = getCronSecretFromRequest(req)
  if (!provided || !timingSafeEqualStrings(provided, expected)) {
    res.status(404).json({ message: 'Not found' })
    return
  }
  next()
}
