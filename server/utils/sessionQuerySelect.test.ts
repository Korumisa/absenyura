import { describe, expect, it } from 'vitest';
import { sessionApiSelect, sessionListSelect, stripSessionQrSecrets } from './sessionQuerySelect.js';

describe('sessionQuerySelect', () => {
  it('sessionApiSelect omits QR signing fields', () => {
    expect(sessionApiSelect).not.toHaveProperty('qr_secret');
    expect(sessionApiSelect).not.toHaveProperty('qr_token');
    expect(sessionApiSelect).toHaveProperty('qr_mode');
  });

  it('sessionListSelect omits QR signing fields at root', () => {
    const select = sessionListSelect({ userId: 'u1', withSemester: true });
    expect(select).not.toHaveProperty('qr_secret');
    expect(select).not.toHaveProperty('qr_token');
  });

  it('stripSessionQrSecrets removes secrets from row', () => {
    const safe = stripSessionQrSecrets({
      id: '1',
      qr_secret: 'secret',
      qr_token: 'token',
      title: 'Test',
    });
    expect(safe).not.toHaveProperty('qr_secret');
    expect(safe).not.toHaveProperty('qr_token');
    expect(safe).toMatchObject({ id: '1', title: 'Test' });
  });

  it('simulated USER API payload has no QR secrets', () => {
    const apiRow = {
      id: 'sess-1',
      title: 'Kelas A',
      qr_mode: 'DYNAMIC',
      status: 'ACTIVE',
    };
    expect(apiRow).not.toHaveProperty('qr_secret');
    expect(apiRow).not.toHaveProperty('qr_token');
  });
});
