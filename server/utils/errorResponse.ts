import type { Response } from 'express';

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

export function sendInternalServerError(res: Response, err: unknown, fallbackData: any = []) {
  const expose = process.env.EXPOSE_ERROR_DETAILS === '1' || process.env.NODE_ENV !== 'production';
  const anyErr = err as any;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  const meta = anyErr?.meta && typeof anyErr.meta === 'object' ? anyErr.meta : undefined;
  const message = safeText(anyErr?.message ?? err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    data: fallbackData,
    ...(expose ? { details: { code, message, meta } } : {}),
  });
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
