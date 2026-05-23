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

export const guardCron = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.headers['x-vercel-cron'] !== '1') {
    res.status(404).json({ message: 'Not found' })
    return
  }
  next()
}
