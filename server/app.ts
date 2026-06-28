/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import crypto from 'crypto';
import { csrfProtect } from './middlewares/csrf.middleware.js';
import { requestTiming } from './middlewares/requestTiming.middleware.js';
import { guardInternal, guardCron } from './middlewares/guardInternal.js';
import prisma from './utils/prisma.js';
import { AppError } from './utils/AppError.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import locationRoutes from './routes/locations.js';
import sessionRoutes from './routes/sessions.js';
import attendanceRoutes from './routes/attendance.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import notificationRoutes from './routes/notifications.js';
import auditRoutes from './routes/audit.js';
import classRoutes from './routes/classes.js';
import excuseRoutes from './routes/excuses.js';
import publicSiteRoutes from './routes/public-site.js';
import cronRoutes from './routes/cron.js';
import { authenticate } from './middlewares/auth.middleware.js';

dotenv.config(); // for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.CLOUDINARY_URL) {
  console.error('[FATAL] CLOUDINARY_URL must be configured in production environment!');
  process.exit(1);
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.INTERNAL_SECRET === 'change_me_before_deploy'
) {
  throw new Error('INTERNAL_SECRET must be rotated before production use.');
}

const attendanceProofSecret = process.env.ATTENDANCE_PROOF_SECRET || '';
if (
  (process.env.NODE_ENV === 'production' || process.env.VERCEL) &&
  attendanceProofSecret.length < 32
) {
  throw new Error('ATTENDANCE_PROOF_SECRET must be set (32+ characters) before production use.');
}

const app: express.Application = express();

if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(requestTiming);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const isProd = process.env.NODE_ENV === 'production';
      if (!origin) return callback(null, true);

      if (!isProd) {
        return callback(null, origin === 'http://localhost:5173');
      }

      const allowedOrigins = new Set(
        String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
          .split(',')
          .flatMap((s) => {
            const result = s.trim();
            return result ? [result] : [];
          })
      );

      if (allowedOrigins.size === 0) {
        return callback(new Error('CORS not configured'), false);
      }

      return callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Seed-Secret',
      'X-Internal-Token',
      'X-Cron-Secret',
    ],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(csrfProtect);

// Cron fallback removed in favor of Vercel Cron endpoint

/**
 * Rate limiting — dirancang untuk NAT kampus (banyak mahasiswa, satu IP publik).
 * - Login: per NIM, BUKAN per IP → 500 login bersamaan aman.
 * - Refresh/API: per cookie sesi (accessToken), BUKAN per IP.
 * - Halaman publik (/public-site): tidak dibatasi ketat.
 */
const isProd = process.env.NODE_ENV === 'production';

const rateLimitMessage = (message: string) => ({
  success: false,
  error_code: 'RATE_LIMITED',
  message,
});

function hashRateLimitSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 200,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage(
    'Terlalu banyak percobaan login untuk akun ini. Tunggu beberapa menit lalu coba lagi.'
  ),
  keyGenerator: (req) => {
    const identity = String((req.body as { nim?: string })?.nim ?? '')
      .trim()
      .toLowerCase();
    if (identity) return `login:user:${identity}`;
    return `login:anon:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 120 : 1000,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.cookies?.refreshToken,
  message: rateLimitMessage('Terlalu banyak permintaan sesi. Muat ulang halaman lalu coba lagi.'),
  keyGenerator: (req) => {
    const token = String(req.cookies?.refreshToken ?? 'missing');
    return `refresh:${hashRateLimitSecret(token)}`;
  },
});

function sessionRateLimitKey(req: Request): string {
  if (req.cookies?.accessToken)
    return `api:at:${hashRateLimitSecret(String(req.cookies.accessToken))}`;
  if (req.cookies?.refreshToken)
    return `api:rt:${hashRateLimitSecret(String(req.cookies.refreshToken))}`;
  if (req.headers?.authorization)
    return `api:auth:${hashRateLimitSecret(String(req.headers.authorization))}`;
  return `api:ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 800 : 5000,
  message: rateLimitMessage('Terlalu banyak permintaan. Silakan coba lagi setelah beberapa menit.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path;
    if (p.startsWith('/auth/')) return true;
    if (p.startsWith('/public-site')) return true;
    if (p === '/health') return true;
    if (p.startsWith('/cron')) return true;
    return false;
  },
  keyGenerator: (req) => sessionRateLimitKey(req),
});

/** Batas longgar khusus IP anonim (tanpa cookie) untuk endpoint non-publik */
const anonymousApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 3000 : 20000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path;
    if (p.startsWith('/auth/') || p.startsWith('/public-site') || p === '/health') return true;
    if (p.startsWith('/cron')) return true;
    return Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  },
  keyGenerator: (req) => `anon:${ipKeyGenerator(req.ip ?? 'unknown')}`,
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/', anonymousApiLimiter);
app.use('/api/', apiLimiter);

app.use('/api/cron', guardCron);
app.use('/api/health', guardInternal);

/** Public liveness for browser — /api/health stays internal-only */
app.get('/api/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, status: 'ok' });
  } catch {
    res.status(503).json({ success: false, status: 'degraded' });
  }
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public-site', publicSiteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/excuses', excuseRoutes);
app.use('/api/cron', cronRoutes);
app.use('/uploads/public-site', express.static(path.join(__dirname, '../uploads/public-site')));
app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));

/**
 * health — DB ping + keep-warm target (Vercel Cron optional)
 */
app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  const ts = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      ts,
      success: true,
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      db: 'disconnected',
      ts,
      success: false,
    });
  }
});

/** @deprecated use GET /api/health */
app.get('/api/health/db', async (_req: Request, res: Response): Promise<void> => {
  const ts = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected', ts, success: true });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected', ts, success: false });
  }
});

/**
 * error handler middleware
 */
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const maybe = err as {
    statusCode?: unknown;
    status?: unknown;
    code?: unknown;
    message?: unknown;
    stack?: unknown;
  };

  const appError = err instanceof AppError ? err : null;

  const rawStatus =
    typeof appError?.statusCode === 'number'
      ? appError.statusCode
      : typeof maybe.statusCode === 'number'
        ? maybe.statusCode
        : typeof maybe.status === 'number'
          ? maybe.status
          : undefined;

  const statusCode =
    typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 499 ? rawStatus : 500;

  const isProd = process.env.NODE_ENV === 'production';
  const rawCode =
    typeof appError?.code === 'string'
      ? appError.code
      : typeof maybe.code === 'string'
        ? maybe.code
        : undefined;

  const errorCode =
    typeof rawCode === 'string' && rawCode.trim()
      ? rawCode
      : statusCode === 500
        ? 'INTERNAL_ERROR'
        : 'BAD_REQUEST';

  const rawMessage =
    typeof appError?.message === 'string'
      ? appError.message
      : typeof maybe.message === 'string'
        ? maybe.message
        : undefined;

  const message =
    statusCode === 500 && isProd
      ? 'Internal server error'
      : typeof rawMessage === 'string' && rawMessage.trim()
        ? rawMessage
        : statusCode === 500
          ? 'Internal server error'
          : 'Bad request';

  if (!isProd) {
    console.error('[ERROR]', req.method, req.path, err instanceof Error ? (err.stack ?? err) : err);
  }

  res.status(statusCode).json({ error: { code: errorCode, message } });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  });
});

export default app;
