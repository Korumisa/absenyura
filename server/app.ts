/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { csrfProtect } from './middlewares/csrf.middleware.js'
import { requestTiming } from './middlewares/requestTiming.middleware.js'
import prisma from './utils/prisma.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import locationRoutes from './routes/locations.js'
import sessionRoutes from './routes/sessions.js'
import attendanceRoutes from './routes/attendance.js'
import dashboardRoutes from './routes/dashboard.js'
import reportRoutes from './routes/reports.js'
import settingsRoutes from './routes/settings.js'
import notificationRoutes from './routes/notifications.js'
import auditRoutes from './routes/audit.js'
import classRoutes from './routes/classes.js'
import excuseRoutes from './routes/excuses.js'
import publicSiteRoutes from './routes/public-site.js'
import cronRoutes from './routes/cron.js'
import { authenticate } from './middlewares/auth.middleware.js'

dotenv.config()// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

if (process.env.NODE_ENV === 'production' && !process.env.CLOUDINARY_URL) {
  console.error('[FATAL] CLOUDINARY_URL must be configured in production environment!');
  process.exit(1);
}

const app: express.Application = express()

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use(requestTiming)

app.disable('x-powered-by')
app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      const isProd = process.env.NODE_ENV === 'production'
      if (!origin) return callback(null, true)

      if (!isProd) {
        return callback(null, origin === 'http://localhost:5173')
      }

      const allowedOrigins = new Set(
        String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )

      if (allowedOrigins.size === 0) {
        return callback(new Error('CORS not configured'), false)
      }

      return callback(null, allowedOrigins.has(origin))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Seed-Secret'],
    optionsSuccessStatus: 204,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(csrfProtect)

// Cron fallback removed in favor of Vercel Cron endpoint

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Attempt to rate limit by user token to prevent Campus NAT IP blocking
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }
    if (req.headers && req.headers.authorization) {
      return req.headers.authorization;
    }
    // Fallback to IP if no auth is present
    return req.ip || 'unknown';
  }
});

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/refresh', authLimiter)
app.use('/api/', apiLimiter);

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/public-site', publicSiteRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/audit-logs', auditRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/excuses', excuseRoutes)
app.use('/api/cron', cronRoutes)
app.use('/uploads/public-site', express.static(path.join(__dirname, '../uploads/public-site')))
app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')))

/**
 * health — DB ping + keep-warm target (Vercel Cron optional)
 */
app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  const ts = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      ts,
      success: true,
    })
  } catch {
    res.status(503).json({
      status: 'degraded',
      db: 'disconnected',
      ts,
      success: false,
    })
  }
})

/** @deprecated use GET /api/health */
app.get('/api/health/db', async (_req: Request, res: Response): Promise<void> => {
  const ts = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: 'ok', db: 'connected', ts, success: true })
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected', ts, success: false })
  }
})

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
