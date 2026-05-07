import type { Response } from 'express';

function safeText(input: unknown, maxLen = 360) {
  const text = typeof input === 'string' ? input : input instanceof Error ? input.message : JSON.stringify(input);
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export function sendInternalServerError(res: Response, err: unknown) {
  const expose = process.env.EXPOSE_ERROR_DETAILS === '1' || process.env.NODE_ENV !== 'production';
  const anyErr = err as any;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  const meta = anyErr?.meta && typeof anyErr.meta === 'object' ? anyErr.meta : undefined;
  const message = safeText(anyErr?.message ?? err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(expose ? { details: { code, message, meta } } : {}),
  });
}

