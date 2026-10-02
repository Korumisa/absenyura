import type { Response } from 'express';
import * as crypto from 'node:crypto';
import { isPrismaConnectionError } from './prismaTransient.js';

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

function _genTraceId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

type ErrorShape = { code?: string; name?: string; meta?: unknown; message?: unknown };

export type ErrorResponseOpts = {
  customErrorMessage?: string;
  fallbackData?: unknown;
};

export function sendInternalServerError(
  res: Response,
  err: unknown,
  optsOrLegacyFallback: unknown = []
) {
  const isLegacyFallback =
    optsOrLegacyFallback == null ||
    Array.isArray(optsOrLegacyFallback) ||
    typeof optsOrLegacyFallback !== 'object';

  const opts: ErrorResponseOpts = isLegacyFallback
    ? { fallbackData: optsOrLegacyFallback }
    : (optsOrLegacyFallback as ErrorResponseOpts);

  const fallbackData = opts.fallbackData ?? [];
  const customErrorMessage = opts.customErrorMessage;

  if (isPrismaConnectionError(err)) {
    sendServiceUnavailable(res, {
      error: customErrorMessage ?? 'Database unavailable',
      fallbackData,
      reason: 'prisma_connection',
    });
    return;
  }

  const traceId = _genTraceId();
  const expose = process.env.EXPOSE_ERROR_DETAILS === '1' || process.env.NODE_ENV !== 'production';
  const anyErr = (err ?? {}) as ErrorShape;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  const name =
    typeof anyErr?.name === 'string' ? anyErr.name : err instanceof Error ? err.name : undefined;
  const meta = anyErr?.meta && typeof anyErr.meta === 'object' ? anyErr.meta : undefined;
  const message = safeText(anyErr?.message ?? err);
  const userError = customErrorMessage ?? 'Internal server error';

  console.error('[5xx]', {
    trace_id: traceId,
    http_status: 500,
    err_code: code ?? null,
    err_name: name ?? null,
    message: message || userError,
  });

  res.status(500).json({
    success: false,
    error: userError,
    trace_id: traceId,
    data: fallbackData,
    ...(expose ? { details: { code, message, meta } } : {}),
  });
}

export function sendServiceUnavailable(
  res: Response,
  opts: { error?: string; fallbackData?: unknown; reason?: string; err?: unknown }
) {
  const traceId = _genTraceId();
  const { error = 'Service unavailable', fallbackData = [], reason, err } = opts;
  const expose = process.env.EXPOSE_ERROR_DETAILS === '1' || process.env.NODE_ENV !== 'production';

  if (err != null) {
    const anyErr = (err as ErrorShape) ?? {};
    const code = typeof anyErr.code === 'string' ? anyErr.code : undefined;
    const name =
      typeof anyErr.name === 'string' ? anyErr.name : err instanceof Error ? err.name : undefined;
    const message = safeText(anyErr.message ?? err);
    console.error('[5xx]', {
      trace_id: traceId,
      http_status: 503,
      err_code: code ?? null,
      err_name: name ?? null,
      message: message || error,
    });
  } else {
    console.error('[5xx]', {
      trace_id: traceId,
      http_status: 503,
      err_code: null,
      err_name: null,
      message: error,
    });
  }

  res.setHeader('Retry-After', '30');
  res.status(503).json({
    success: false,
    error,
    trace_id: traceId,
    data: fallbackData,
    retry_after_ms: 30_000,
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
