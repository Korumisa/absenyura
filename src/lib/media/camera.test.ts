import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  pickPreferredCameraId,
  acquireCameraLock,
  resetCameraLockForTests,
  classifyCameraError,
  humanizeCameraError,
  getCameraDebugSnapshot,
  formatCameraDebugReport,
  waitForCameraRelease,
} from './camera';

describe('pickPreferredCameraId', () => {
  test('prefers back/rear/environment camera when available', () => {
    expect(
      pickPreferredCameraId([
        { id: 'front', label: 'Front Camera' },
        { id: 'back', label: 'Back Camera' },
      ])
    ).toBe('back');
  });

  test('can prefer front camera when requested', () => {
    expect(
      pickPreferredCameraId(
        [
          { id: 'front', label: 'Front Camera' },
          { id: 'back', label: 'Back Camera' },
        ],
        { preferRear: false }
      )
    ).toBe('front');
  });

  test('falls back to first device when labels are empty', () => {
    expect(
      pickPreferredCameraId([
        { id: 'a', label: '' },
        { id: 'b', label: '' },
      ])
    ).toBe('a');
  });
});

describe('classifyCameraError', () => {
  test('classifies NotAllowedError / PermissionDeniedError as NOT_ALLOWED', () => {
    expect(classifyCameraError({ name: 'NotAllowedError' })).toBe('NOT_ALLOWED');
    expect(classifyCameraError({ name: 'PermissionDeniedError' })).toBe('NOT_ALLOWED');
    expect(classifyCameraError({ name: 'SecurityError' })).toBe('NOT_ALLOWED');
  });

  test('classifies NotFoundError / DevicesNotFoundError as NOT_FOUND', () => {
    expect(classifyCameraError({ name: 'NotFoundError' })).toBe('NOT_FOUND');
    expect(classifyCameraError({ name: 'OverconstrainedError' })).toBe('OVERCONSTRAINED');
    expect(classifyCameraError({ name: 'DevicesNotFoundError' })).toBe('NOT_FOUND');
  });

  test('classifies NotReadableError as NOT_READABLE, AbortError as ABORT', () => {
    expect(classifyCameraError({ name: 'NotReadableError' })).toBe('NOT_READABLE');
    expect(classifyCameraError({ name: 'AbortError' })).toBe('ABORT');
  });

  test('classifies lock/digunakan messages as LOCKED', () => {
    expect(classifyCameraError(new Error('HardwareError camera locked'))).toBe('LOCKED');
    expect(classifyCameraError(new Error('sedang dipakai aplikasi lain'))).toBe('LOCKED');
  });

  test('classifies recovering keyword as RECOVERING', () => {
    expect(classifyCameraError(new Error('recovering stream'))).toBe('RECOVERING');
    expect(classifyCameraError(new Error('memulihkan'))).toBe('RECOVERING');
  });

  test('classifies unknown / null as UNKNOWN', () => {
    expect(classifyCameraError(new Error('something weird'))).toBe('UNKNOWN');
    expect(classifyCameraError(null)).toBe('UNKNOWN');
    expect(classifyCameraError(undefined)).toBe('UNKNOWN');
  });
});

describe('humanizeCameraError', () => {
  test('returns Indonesian sentence with wait/tunggu for NOT_READABLE', () => {
    const msg = humanizeCameraError({ name: 'NotReadableError' });
    expect(msg).toMatch(/kamera/i);
    expect(msg).toMatch(/tunggu/i);
  });

  test('returns hint to close other tabs for LOCKED category', () => {
    const msg = humanizeCameraError(new Error('sedang dipakai'));
    expect(msg.toLowerCase()).toMatch(/tab lain|aplikasi lain/i);
  });

  test('formats attempt/max with RECOVERING keyword in opts', () => {
    const msg = humanizeCameraError({ message: 'recovering' }, { attempt: 2, max: 3 });
    expect(msg).toMatch(/2\/3/);
  });

  test('falls back to default sentence when no specific match', () => {
    const msg = humanizeCameraError(new Error('boom'));
    expect(msg.length).toBeGreaterThan(10);
  });
});

describe('debug snapshot helpers', () => {
  test('getCameraDebugSnapshot returns structured object with timestamp', () => {
    const snap = getCameraDebugSnapshot({ status: 'degraded', reconnectAttempt: 2 });
    expect(typeof snap.timestamp).toBe('string');
    expect(snap.status).toBe('degraded');
    expect(snap.reconnectAttempt).toBe(2);
    expect(typeof snap.ua).toBe('string');
    expect(typeof snap.activeStreams).toBe('number');
  });

  test('formatCameraDebugReport returns clipboard-friendly lines', () => {
    const snap = getCameraDebugSnapshot({});
    const report = formatCameraDebugReport(snap);
    expect(report).toMatch(/\[CAM Debug\]/i);
    expect(report).toMatch(/UA:/);
    expect(report).toMatch(/ActiveStreams:/);
  });
});

describe('acquireCameraLock (mutex)', () => {
  beforeEach(() => {
    resetCameraLockForTests();
  });

  test('first acquire resolves immediately and returns release fn', async () => {
    const release = await acquireCameraLock('owner-a');
    expect(typeof release).toBe('function');
    release();
  });

  test('second acquire queues until first release is called', async () => {
    let secondResolved = false;
    const firstRelease = await acquireCameraLock('owner-a');
    const secondPromise = acquireCameraLock('owner-b').then((release) => {
      secondResolved = true;
      return release;
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(secondResolved).toBe(false);

    firstRelease();
    const secondRelease = await secondPromise;
    expect(secondResolved).toBe(true);
    secondRelease();
  });
});

describe('waitForCameraRelease (adaptive polling)', () => {
  let originalEnumerate: MediaDevices['enumerateDevices'] | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      originalEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && originalEnumerate) {
      const md = navigator.mediaDevices as MediaDevices & {
        enumerateDevices: MediaDevices['enumerateDevices'];
      };
      md.enumerateDevices = originalEnumerate;
      originalEnumerate = null;
    }
  });

  test.skip('resolves within stable streak when active track count is zero', async () => {
    // Skipped: jsdom lacks faithful MediaStream + timer microtask scheduling;
    // polling logic is exercised end-to-end via integration flows instead.
    await waitForCameraRelease(50);
  }, 1000);
});
