import { Response } from 'express';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function sendValidationError(
  res: Response,
  payload: {
    fieldErrors: Record<string, string>;
    error_code?: string;
    message?: string;
  }
): void {
  const field_errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload.fieldErrors)) {
    field_errors[camelToSnake(key)] = value;
  }
  res.status(400).json({
    success: false,
    error_code: payload.error_code ?? 'VALIDATION_ERROR',
    message: payload.message ?? 'Validasi input gagal.',
    field_errors,
  });
}
