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
import { requestTiming, getRuntimeMetrics } from './middlewares/requestTiming.middleware.js';
import { checkReadiness } from './services/readiness.js';
import { guardHealth, guardCron } from './middlewares/guardInternal.js';
import prisma from './utils/prisma.js';
import { AppError } from './utils/AppError.js';
import { isPrismaConnectionError } from './utils/prismaTransient.js';
import { sendServiceUnavailable } from './utils/errorResponse.js';
import { normalizeIp } from './utils/ip.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import locationRoutes from './routes/locations.js';
import sessionRoutes from './routes/sessions.js';
import attendanceRoutes from './routes/attendance.js';
import { attendanceErrors } from './middlewares/attendanceErrors.js';
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

app.use((req: Request, res: Response, next: NextFunction) => {
  const existing = req.header('x-request-id');
  const traceId =
    typeof existing === 'string' && existing.length > 0 && existing.length <= 128
      ? existing
      : crypto.randomUUID();
  res.setHeader('X-Request-ID', traceId);
  res.locals.traceId = traceId;
  (req as Request & { traceId?: string }).traceId = traceId;
  next();
});

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", 'https:'],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
        frameSrc: [
          "'self'",
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://vercel.live',
        ],
        workerSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
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
      'X-Idempotency-Key',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
    optionsSuccessStatus: 204,
  })
);
app.use('/api/attendance', attendanceErrors);
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
    return `login:anon:${ipKeyGenerator(normalizeIp(req.ip))}`;
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 240 : 1000,
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
  return `api:ip:${ipKeyGenerator(normalizeIp(req.ip))}`;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1500 : 5000,
  message: rateLimitMessage('Terlalu banyak permintaan. Silakan coba lagi setelah beberapa menit.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path;
    if (p.startsWith('/auth/')) return true;
    if (p.startsWith('/public-site')) return true;
    if (p === '/health' || p === '/health/db' || p === '/status') return true;
    if (p.startsWith('/cron')) return true;
    return false;
  },
  keyGenerator: (req) => sessionRateLimitKey(req),
});

/** Batas longgar khusus IP anonim (tanpa cookie) untuk endpoint non-publik */
const anonymousApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5000 : 20000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path;
    if (
      p.startsWith('/auth/') ||
      p.startsWith('/public-site') ||
      p === '/health' ||
      p === '/health/db' ||
      p === '/status'
    )
      return true;
    if (p.startsWith('/cron')) return true;
    return Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  },
  keyGenerator: (req) => `anon:${ipKeyGenerator(normalizeIp(req.ip))}`,
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/', anonymousApiLimiter);
app.use('/api/', apiLimiter);

app.use('/api/cron', guardCron);
app.use('/api/health', guardHealth);

/** Browser probes share a bounded, short-lived readiness result per instance. */
app.get('/api/status', async (_req: Request, res: Response): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store');
  const result = await checkReadiness();
  if (result.ready) {
    res.status(200).json({ success: true, status: 'ok' });
  } else {
    sendServiceUnavailable(res, {
      error: 'Layanan sedang sibuk atau belum tersedia. Tunggu 30 detik lalu coba lagi.',
      reason: 'readiness_failed',
    });
  }
});

const SITE_URL = 'https://hmsdp.vercel.app';

function formatLastMod(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.get('/api/sitemap.xml', async (_req: Request, res: Response): Promise<void> => {
  try {
    const staticRoutes: Array<{ path: string; changefreq: string; priority: string }> = [
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/berita', changefreq: 'daily', priority: '0.9' },
      { path: '/struktur-organisasi', changefreq: 'monthly', priority: '0.8' },
      { path: '/program-kerja', changefreq: 'weekly', priority: '0.9' },
      { path: '/informasi-lomba', changefreq: 'weekly', priority: '0.8' },
      { path: '/informasi', changefreq: 'weekly', priority: '0.8' },
      { path: '/galeri', changefreq: 'weekly', priority: '0.7' },
      { path: '/open-recruitment', changefreq: 'monthly', priority: '0.7' },
    ];

    const [posts, programs] = await Promise.all([
      prisma.publicPost.findMany({
        where: { type: 'BERITA', is_published: true },
        select: { slug: true, updated_at: true },
      }),
      prisma.publicProgram.findMany({
        where: { is_published: true },
        select: { id: true, updated_at: true },
      }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const urlParts: string[] = [];

    for (const route of staticRoutes) {
      const loc = xmlEscape(`${SITE_URL}${route.path}`);
      urlParts.push(
        `<url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${route.changefreq}</changefreq><priority>${route.priority}</priority></url>`
      );
    }

    for (const post of posts) {
      const loc = xmlEscape(`${SITE_URL}/berita/${post.slug}`);
      urlParts.push(
        `<url><loc>${loc}</loc><lastmod>${formatLastMod(post.updated_at)}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
      );
    }

    for (const prog of programs) {
      const loc = xmlEscape(`${SITE_URL}/program-kerja/${prog.id}`);
      urlParts.push(
        `<url><loc>${loc}</loc><lastmod>${formatLastMod(prog.updated_at)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlParts.join('')}</urlset>`;

    res
      .set({
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Length': Buffer.byteLength(xml, 'utf8'),
      })
      .status(200)
      .send(xml);
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      sendServiceUnavailable(res, { error: 'Sitemap unavailable', reason: 'prisma_connection' });
      return;
    }
    res.status(503).json({ success: false, error: 'Failed to generate sitemap' });
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
  res.setHeader('Cache-Control', 'no-store');
  const result = await checkReadiness();
  if (result.ready) {
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      ts,
      success: true,
      checked_at: result.checked_at,
      metrics: getRuntimeMetrics(),
    });
  } else {
    sendServiceUnavailable(res, {
      error: 'Layanan belum siap. Hubungi pengelola dengan kode referensi.',
      reason: 'readiness_failed',
      fallbackData: { checked_at: result.checked_at, metrics: getRuntimeMetrics() },
    });
  }
});

/** @deprecated use GET /api/health */
app.get('/api/health/db', async (_req: Request, res: Response): Promise<void> => {
  const ts = Date.now();
  res.setHeader('Cache-Control', 'no-store');
  const result = await checkReadiness();
  if (result.ready) {
    res.status(200).json({ status: 'ok', db: 'connected', ts, success: true });
  } else {
    sendServiceUnavailable(res, { error: 'Layanan belum siap.', reason: 'readiness_failed' });
  }
});

/**
 * error handler middleware
 */
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  void _next;
  const traceId =
    (typeof res.locals?.traceId === 'string' && res.locals.traceId) ||
    ((req as Request & { traceId?: string }).traceId ?? crypto.randomUUID());
  const normalizedIp = normalizeIp(req.ip);

  if (isPrismaConnectionError(err)) {
    console.error(
      JSON.stringify({
        trace_id: traceId,
        level: 'error',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        ip: normalizedIp,
        category: 'prisma_connection',
        error_message: err instanceof Error ? err.message : 'Prisma connection error',
        stack:
          process.env.NODE_ENV === 'production'
            ? undefined
            : err instanceof Error
              ? err.stack?.split('\n').slice(0, 5)
              : undefined,
      } satisfies Record<string, unknown>)
    );
    sendServiceUnavailable(res, {
      error: 'Database unavailable',
      reason: 'prisma_connection',
    });
    return;
  }

  const maybe = err as {
    statusCode?: unknown;
    status?: unknown;
    code?: unknown;
    message?: unknown;
    stack?: unknown;
    name?: unknown;
  };

  const appError = err instanceof AppError ? err : null;
  const errName =
    typeof maybe.name === 'string' ? maybe.name : err instanceof Error ? err.name : '';
  const errCode = typeof maybe.code === 'string' ? maybe.code : '';
  const errMessage = typeof maybe.message === 'string' ? maybe.message : '';

  const isMulterError =
    errName === 'MulterError' ||
    errCode.startsWith('LIMIT_') ||
    errName.toLowerCase().includes('multer') ||
    errMessage.toLowerCase().includes('multer') ||
    errMessage.toLowerCase().includes('file too large') ||
    errMessage.toLowerCase().includes('hanya file gambar') ||
    errMessage.toLowerCase().includes('hanya file excel');

  const isInputValidationError =
    errName === 'ZodError' ||
    errName === 'TypeError' ||
    errName === 'RangeError' ||
    errName === 'SyntaxError' ||
    errName.toLowerCase() === 'validationerror' ||
    errCode === 'VALIDATION_ERROR' ||
    (errCode.startsWith('P200') && errCode !== 'P2024') ||
    errCode === 'P2007' ||
    errCode === 'P2008' ||
    errCode === 'P2009' ||
    errCode === 'P2010' ||
    errCode === 'P2013' ||
    errCode === 'P2014' ||
    errCode === 'P2015' ||
    errCode === 'P2016' ||
    errCode === 'P2017' ||
    errCode === 'P2018' ||
    errCode === 'P2020' ||
    errCode === 'P2021' ||
    errCode === 'P2022' ||
    errCode === 'P2023' ||
    errCode === 'P2025' ||
    errCode === 'P2026' ||
    errCode === 'P2027' ||
    errCode === 'P2028' ||
    errCode === 'P2029' ||
    errCode === 'P2030' ||
    errCode === 'P2031' ||
    errCode === 'P2032' ||
    errCode === 'P2033' ||
    errCode === 'P2034';

  const inferredClientStatusCode: number | undefined =
    isMulterError || isInputValidationError ? 400 : undefined;

  const rawStatus =
    typeof appError?.statusCode === 'number'
      ? appError.statusCode
      : typeof maybe.statusCode === 'number'
        ? maybe.statusCode
        : typeof maybe.status === 'number'
          ? maybe.status
          : inferredClientStatusCode;

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

  if (!isProd || statusCode === 500) {
    console.error(
      JSON.stringify({
        trace_id: traceId,
        level: statusCode === 500 ? 'error' : 'warn',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        ip: normalizedIp,
        status_code: statusCode,
        error_code: errorCode,
        error_message: message,
        stack: isProd
          ? undefined
          : err instanceof Error
            ? err.stack?.split('\n').slice(0, 5)
            : undefined,
      } satisfies Record<string, unknown>)
    );
  }

  res.setHeader('X-Request-ID', traceId);
  res.status(statusCode).json({ error: { code: errorCode, message, trace_id: traceId } });
});

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  const traceId =
    (typeof res.locals?.traceId === 'string' && res.locals.traceId) || crypto.randomUUID();
  res.setHeader('X-Request-ID', traceId);
  res.status(404).json({
    success: false,
    error: 'API not found',
    trace_id: traceId,
  });
});

export default app;
