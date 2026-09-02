import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { sendBadRequest } from '../utils/errorResponse.js';

function formatZodErrors(err: ZodError): string {
  const issues = err.issues;
  if (issues.length === 0) return 'Validasi data gagal.';
  const first = issues[0];
  const path = first.path.length > 0 ? first.path.join('.') : 'input';
  return `${path}: ${first.message}`;
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const message = formatZodErrors(result.error);
      sendBadRequest(res, {
        error_code: 'VALIDATION_ERROR',
        message,
      });
      return;
    }
    req.body = result.data as any;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params ?? {});
    if (!result.success) {
      const message = formatZodErrors(result.error);
      sendBadRequest(res, {
        error_code: 'VALIDATION_ERROR',
        message,
      });
      return;
    }
    req.params = result.data as any;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      const message = formatZodErrors(result.error);
      sendBadRequest(res, {
        error_code: 'VALIDATION_ERROR',
        message,
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}
