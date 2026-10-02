import { describe, expect, it } from 'vitest';
import { parseAttendanceQr } from './attendanceQr';

describe('attendance QR parsing', () => {
  it('accepts QR URLs and decodes dynamic tokens', () => {
    expect(
      parseAttendanceQr('https://hmsdp.me/attend?session=s1&token=s1%3A15000%3Asig', 's1')
    ).toEqual({ sessionId: 's1', token: 's1:15000:sig' });
  });
  it('accepts raw dynamic tokens and static tokens scoped to the selected session', () => {
    expect(parseAttendanceQr('s1:15000:sig', null)?.sessionId).toBe('s1');
    expect(parseAttendanceQr('static-token', 's1')?.token).toBe('static-token');
  });
  it.each(['s1', 'NO_QR_REQUIRED', '', '/attend?session=s1'])(
    'rejects missing or substituted tokens: %s',
    (raw) => {
      expect(parseAttendanceQr(raw, 's1')).toBeNull();
    }
  );
  it('rejects scanning a different session from the Hadir button', () => {
    expect(parseAttendanceQr('https://hmsdp.me/attend?session=s2&token=valid', 's1')).toBeNull();
  });
});
