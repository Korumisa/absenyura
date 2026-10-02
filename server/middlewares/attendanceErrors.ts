import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { attendanceFeedback } from '../../src/lib/http/attendanceError.js';

// Installed before auth/upload so every attendance error has the same public contract.
export const attendanceErrors: RequestHandler = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 400) return json(body);
    const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const raw =
      typeof data.error === 'object' && data.error
        ? (data.error as Record<string, unknown>).message
        : data.error;
    const feedback = attendanceFeedback(res.statusCode, raw);
    let traceId =
      typeof data.trace_id === 'string' && /^[A-F0-9]{12}$/i.test(data.trace_id)
        ? data.trace_id
        : undefined;
    if (res.statusCode >= 500 && !traceId) {
      traceId = randomBytes(6).toString('hex').toUpperCase();
      console.error('[attendance:5xx]', {
        trace_id: traceId,
        http_status: res.statusCode,
        method: req.method,
        path: req.path,
      });
    }
    if (res.statusCode === 503) res.setHeader('Retry-After', '30');
    return json({
      success: false,
      error: feedback.message,
      error_code: feedback.code,
      ...(traceId ? { trace_id: traceId } : {}),
      ...(res.statusCode === 503 ? { retry_after_ms: 30_000 } : {}),
    });
  };
  next();
};
