import type { Request, Response } from 'express';
import { isPrismaConnectionError } from './prismaTransient.js';
import { normalizeIp } from './ip.js';

function safeText(input: unknown, maxLen = 360) {
  const text =
    typeof input === 'string'
      ? input
      : input instanceof Error
        ? input.message
        : JSON.stringify(input);
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export function sendInternalServerError(
  res: Response,
  err: unknown,
  fallbackData: any = [],
  req?: Request
) {
  const traceId =
    (typeof res.locals?.traceId === 'string' && res.locals.traceId) ||
    (typeof req === 'object' && req
      ? ((req as Request & { traceId?: string }).traceId as string | undefined)
      : undefined);
  if (traceId && !res.getHeader('X-Request-ID')) {
    res.setHeader('X-Request-ID', traceId);
  }

  const method = req?.method;
  const url = req ? req.originalUrl || req.url : undefined;
  const normalizedIp = req ? normalizeIp(req.ip) : undefined;

  if (isPrismaConnectionError(err)) {
    const statusCode = 503;
    console.error(
      JSON.stringify({
        trace_id: traceId,
        level: 'error',
        timestamp: new Date().toISOString(),
        method,
        url,
        ip_normalized: normalizedIp,
        status_code: statusCode,
        category: 'prisma_connection',
        error_message: err instanceof Error ? err.message : 'Prisma connection error',
      } satisfies Record<string, unknown>)
    );
    const body: Record<string, unknown> = {
      success: false,
      error: 'Database unavailable',
      data: fallbackData,
      retry_after_ms: 2000,
      details: { reason: 'prisma_connection' },
    };
    if (traceId) body.trace_id = traceId;
    res.status(statusCode).json(body);
    return;
  }

  const expose = process.env.EXPOSE_ERROR_DETAILS === '1' || process.env.NODE_ENV !== 'production';
  const anyErr = err as any;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  const meta = anyErr?.meta && typeof anyErr.meta === 'object' ? anyErr.meta : undefined;
  const message = safeText(anyErr?.message ?? err);
  const statusCode = 500;

  console.error(
    JSON.stringify({
      trace_id: traceId,
      level: 'error',
      timestamp: new Date().toISOString(),
      method,
      url,
      ip_normalized: normalizedIp,
      status_code: statusCode,
      error_code: code || 'INTERNAL_ERROR',
      error_message: message,
    } satisfies Record<string, unknown>)
  );

  const body: Record<string, unknown> = {
    success: false,
    error: 'Internal server error',
    data: fallbackData,
    ...(expose ? { details: { code, message, meta } } : {}),
  };
  if (traceId) body.trace_id = traceId;

  res.status(statusCode).json(body);
}

export function sendServiceUnavailable(
  res: Response,
  opts: { error?: string; fallbackData?: any; reason?: string }
) {
  const { error = 'Service unavailable', fallbackData = [], reason } = opts;
  const expose = process.env.EXPOSE_ERROR_DETAILS === '1' || process.env.NODE_ENV !== 'production';
  res.status(503).json({
    success: false,
    error,
    data: fallbackData,
    retry_after_ms: 2000,
    ...(expose && reason ? { details: { reason } } : {}),
  });
}

export function sendForbidden(res: Response, payload: { error_code: string; message: string }) {
  res.status(403).json({
    success: false,
    error_code: payload.error_code,
    message: payload.message,
    error: payload.message,
  });
}

export function sendBadRequest(res: Response, payload: { error_code: string; message: string }) {
  res.status(400).json({
    success: false,
    error_code: payload.error_code,
    message: payload.message,
    error: payload.message,
  });
}
