import { describe, expect, it } from 'vitest';
import { attendanceError, attendanceFeedback } from './attendanceError';

describe('safe attendance feedback', () => {
  it.each([400, 401, 403, 404, 413, 429, 500, 503])(
    'never reflects internal details for HTTP %i',
    (status) => {
      const result = attendanceFeedback(
        status,
        'Prisma /var/task/server.ts DATABASE_URL postgres://secret'
      );
      expect(result.message).not.toMatch(/Prisma|\/var|DATABASE_URL|postgres|secret/);
    }
  );

  it('distinguishes expired QR, invalid GPS, and photo proof errors', () => {
    expect(attendanceFeedback(400, 'QR Code sudah kedaluwarsa. Silakan scan ulang').code).toBe(
      'QR_EXPIRED'
    );
    expect(attendanceFeedback(400, 'Data lokasi tidak valid').code).toBe('LOCATION_INVALID');
    expect(attendanceFeedback(400, 'Security proof (nonce/signature) tidak valid').code).toBe(
      'PHOTO_INVALID'
    );
  });

  it('handles non-string bodies and network errors safely', () => {
    expect(
      attendanceError({ response: { status: 400, data: { error: { details: '/private' } } } }).code
    ).toBe('INVALID_INPUT');
    expect(attendanceError(new Error('/private/system.ts')).code).toBe('INVALID_INPUT');
    expect(attendanceError({ code: 'ERR_NETWORK' }).code).toBe('OFFLINE');
    expect(attendanceError(new Error('Foto belum dapat dikompres.')).code).toBe('PHOTO_INVALID');
  });

  it('keeps safe messages unchanged after the client defense layer', () => {
    const result = attendanceFeedback(400, 'QR Code sudah kedaluwarsa');
    expect(attendanceFeedback(400, result.message)).toEqual(result);
  });
});
