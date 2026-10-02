// @vitest-environment jsdom
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
  createStreamHealthWatchdog,
  createQrScanWatchdog,
  type WatchdogStatus,
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

  test('resolves within stable streak when active track count is zero', async () => {
    const released = waitForCameraRelease(50);
    await vi.runAllTimersAsync();
    await released;
    expect(vi.getTimerCount()).toBe(0);
  }, 1000);
});

type MockTrack = { readyState: MediaStreamTrackState; kind: string };
function makeMockStream(tracks: MockTrack[]): MediaStream {
  return {
    id: 'mock-stream-' + Math.random().toString(36).slice(2, 8),
    active: true,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video') as unknown as MediaStreamTrack[],
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio') as unknown as MediaStreamTrack[],
    getTracks: () => tracks as unknown as MediaStreamTrack[],
    getTrackById: () => null,
    addTrack: () => {
      /* noop */
    },
    removeTrack: () => {
      /* noop */
    },
    clone: () => makeMockStream(tracks.map((t) => ({ ...t }))),
    addEventListener: () => {
      /* noop */
    },
    removeEventListener: () => {
      /* noop */
    },
    dispatchEvent: () => true,
  } as unknown as MediaStream;
}

type WatchdogWithTest = ReturnType<typeof createStreamHealthWatchdog> & {
  _test: {
    triggerDegrade: (r: string) => void;
    onVisibilityChange: () => void;
    getConsecutiveCount: () => number;
    isReconnectSuspended: () => boolean;
    getGracePeriodMs: () => number;
    getConsecutiveThreshold: () => number;
    getInitializedAt: () => number;
    setInitializedAt: (n: number) => void;
    clearPollersAndMonitors: () => void;
  };
};

describe('watchdog: qr-scan preset defaults', () => {
  test('TR-0.1 createQrScanWatchdog applies threshold=3 and gracePeriod=5000', () => {
    const wd = createQrScanWatchdog(null, null, {
      reconnect: { enabled: false },
    }) as WatchdogWithTest;
    try {
      expect(wd._test.getConsecutiveThreshold()).toBe(3);
      expect(wd._test.getGracePeriodMs()).toBe(5000);
    } finally {
      wd.destroy();
    }
  });

  test('TR-0.2 createStreamHealthWatchdog defaults to threshold=2 and grace=0', () => {
    const wd = createStreamHealthWatchdog(null, null, {
      reconnect: { enabled: false },
    }) as WatchdogWithTest;
    try {
      expect(wd._test.getConsecutiveThreshold()).toBe(2);
      expect(wd._test.getGracePeriodMs()).toBe(0);
    } finally {
      wd.destroy();
    }
  });
});

describe('watchdog: consecutive degrade counter with threshold=3 (TR-1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('TR-1.1 single degrade below threshold (3) does NOT fire statusChange:degraded', () => {
    const statuses: WatchdogStatus[] = [];
    const wd = createStreamHealthWatchdog(null, null, {
      consecutiveThreshold: 3,
      gracePeriodMs: 0,
      reconnect: { enabled: false },
      handleVisibilityLifecycle: false,
      onStatusChange: (s) => statuses.push(s),
    }) as WatchdogWithTest;
    try {
      wd._test.clearPollersAndMonitors();
      wd._test.setInitializedAt(performance.now() - 10_000);
      wd._test.triggerDegrade('test-1');
      expect(wd._test.getConsecutiveCount()).toBe(1);
      expect(statuses.includes('degraded')).toBe(false);
    } finally {
      wd.destroy();
    }
  });

  test('TR-1.2 3 consecutive degrade signals fire degraded then failed (reconnect disabled)', () => {
    const statuses: WatchdogStatus[] = [];
    const wd = createStreamHealthWatchdog(null, null, {
      consecutiveThreshold: 3,
      gracePeriodMs: 0,
      reconnect: { enabled: false },
      handleVisibilityLifecycle: false,
      onStatusChange: (s) => statuses.push(s),
    }) as WatchdogWithTest;
    try {
      wd._test.clearPollersAndMonitors();
      wd._test.setInitializedAt(performance.now() - 10_000);
      wd._test.triggerDegrade('t1');
      wd._test.triggerDegrade('t2');
      wd._test.triggerDegrade('t3');
      expect(statuses).toContain('degraded');
      expect(statuses).toContain('failed');
    } finally {
      wd.destroy();
    }
  });

  test('TR-1.3 counter resets after 2000ms of no signals', () => {
    const statuses: WatchdogStatus[] = [];
    const wd = createStreamHealthWatchdog(null, null, {
      consecutiveThreshold: 3,
      gracePeriodMs: 0,
      reconnect: { enabled: false },
      handleVisibilityLifecycle: false,
      onStatusChange: (s) => statuses.push(s),
    }) as WatchdogWithTest;
    try {
      wd._test.clearPollersAndMonitors();
      wd._test.setInitializedAt(performance.now() - 10_000);
      wd._test.triggerDegrade('x1');
      wd._test.triggerDegrade('x2');
      expect(wd._test.getConsecutiveCount()).toBe(2);
      vi.advanceTimersByTime(2500);
      expect(wd._test.getConsecutiveCount()).toBe(0);
      wd._test.triggerDegrade('y1');
      wd._test.triggerDegrade('y2');
      expect(wd._test.getConsecutiveCount()).toBe(2);
      expect(statuses.includes('degraded')).toBe(false);
    } finally {
      wd.destroy();
    }
  });
});

describe('watchdog: grace period 5s suppresses all degrade signals (TR-1.3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('TR-1.3 degrade inside gracePeriod does not count nor trigger reconnect', () => {
    const statuses: WatchdogStatus[] = [];
    const wd = createStreamHealthWatchdog(null, null, {
      consecutiveThreshold: 1,
      gracePeriodMs: 5000,
      reconnect: { enabled: false },
      handleVisibilityLifecycle: false,
      onStatusChange: (s) => statuses.push(s),
    }) as WatchdogWithTest;
    try {
      wd._test.clearPollersAndMonitors();
      const beforeStorm = statuses.length;
      for (let i = 0; i < 10; i++) wd._test.triggerDegrade('storm-' + i);
      expect(statuses.length).toBe(beforeStorm);
      expect(statuses.includes('degraded')).toBe(false);
      expect(wd._test.getConsecutiveCount()).toBe(0);
      wd._test.setInitializedAt(performance.now() - 6000);
      wd._test.triggerDegrade('after-grace');
      expect(statuses).toContain('degraded');
    } finally {
      wd.destroy();
    }
  });
});

describe('watchdog: suspendAutoReconnect suppresses all reconnects (TR-1.4 / TR-1.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('TR-1.4 suspendAutoReconnect prevents degrade reconnect even above threshold', () => {
    const statuses: WatchdogStatus[] = [];
    const wd = createStreamHealthWatchdog(null, null, {
      consecutiveThreshold: 3,
      gracePeriodMs: 0,
      reconnect: { enabled: false },
      handleVisibilityLifecycle: false,
      onStatusChange: (s) => statuses.push(s),
    }) as WatchdogWithTest;
    try {
      wd._test.clearPollersAndMonitors();
      wd._test.setInitializedAt(performance.now() - 10_000);
      wd.suspendAutoReconnect('html5qrcode-pause');
      expect(wd._test.isReconnectSuspended()).toBe(true);
      for (let i = 0; i < 10; i++) wd._test.triggerDegrade('flood-' + i);
      expect(statuses.includes('degraded')).toBe(false);
    } finally {
      wd.destroy();
    }
  });

  test('TR-1.5 resumeAutoReconnect re-enables threshold flow', () => {
    const statuses: WatchdogStatus[] = [];
    const wd = createStreamHealthWatchdog(null, null, {
      consecutiveThreshold: 2,
      gracePeriodMs: 0,
      reconnect: { enabled: false },
      handleVisibilityLifecycle: false,
      onStatusChange: (s) => statuses.push(s),
    }) as WatchdogWithTest;
    try {
      wd._test.clearPollersAndMonitors();
      wd._test.setInitializedAt(performance.now() - 10_000);
      wd.suspendAutoReconnect('temp');
      wd._test.triggerDegrade('a');
      wd._test.triggerDegrade('b');
      expect(statuses.includes('degraded')).toBe(false);
      wd.resumeAutoReconnect();
      expect(wd._test.isReconnectSuspended()).toBe(false);
      wd._test.triggerDegrade('c');
      wd._test.triggerDegrade('d');
      expect(statuses).toContain('degraded');
    } finally {
      wd.destroy();
    }
  });
});

(typeof document !== 'undefined' ? describe : describe.skip)(
  'watchdog: visibility handler conditional + debounce 3s (TR-2)',
  () => {
    let origVisibility: Document['visibilityState'];
    let origHidden: Document['hidden'];
    const setDocVisibility = (state: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        writable: true,
        value: state,
      });
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        writable: true,
        value: state === 'hidden',
      });
    };

    beforeEach(() => {
      vi.useFakeTimers();
      origVisibility = document.visibilityState;
      origHidden = document.hidden;
      setDocVisibility('visible');
    });
    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        writable: true,
        value: origVisibility,
      });
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        writable: true,
        value: origHidden,
      });
    });

    test('TR-2.1 hidden → status paused; visible → resume healthy WITHOUT unconditional degrade', () => {
      const statuses: WatchdogStatus[] = [];
      const liveStream = makeMockStream([{ kind: 'video', readyState: 'live' }]);
      const wd = createStreamHealthWatchdog(liveStream, null, {
        consecutiveThreshold: 1,
        gracePeriodMs: 0,
        reconnect: { enabled: false },
        handleVisibilityLifecycle: false,
        onStatusChange: (s) => statuses.push(s),
      }) as WatchdogWithTest;
      try {
        wd._test.clearPollersAndMonitors();
        wd._test.setInitializedAt(performance.now() - 10_000);
        setDocVisibility('hidden');
        wd._test.onVisibilityChange();
        expect(statuses).toContain('paused');
        setDocVisibility('visible');
        statuses.length = 0;
        wd._test.onVisibilityChange();
        vi.advanceTimersByTime(4000);
        expect(statuses.filter((s) => s === 'degraded').length).toBe(0);
        expect(statuses.filter((s) => s === 'failed').length).toBe(0);
      } finally {
        wd.destroy();
      }
    });

    test('TR-2.2 visibility resume → stream has ended track → degrade fires after 3000ms debounce', () => {
      const statuses: WatchdogStatus[] = [];
      const endedStream = makeMockStream([{ kind: 'video', readyState: 'ended' }]);
      const wd = createStreamHealthWatchdog(endedStream, null, {
        consecutiveThreshold: 1,
        gracePeriodMs: 0,
        reconnect: { enabled: false },
        handleVisibilityLifecycle: false,
        onStatusChange: (s) => statuses.push(s),
      }) as WatchdogWithTest;
      try {
        wd._test.clearPollersAndMonitors();
        wd._test.setInitializedAt(performance.now() - 10_000);
        setDocVisibility('hidden');
        wd._test.onVisibilityChange();
        setDocVisibility('visible');
        statuses.length = 0;
        wd._test.onVisibilityChange();
        vi.advanceTimersByTime(1000);
        expect(statuses.includes('degraded')).toBe(false);
        vi.advanceTimersByTime(2500);
        expect(statuses).toContain('degraded');
      } finally {
        wd.destroy();
      }
    });

    test('TR-2.3 visibility resume → tracks still live → skip degrade entirely', () => {
      const statuses: WatchdogStatus[] = [];
      const liveStream = makeMockStream([{ kind: 'video', readyState: 'live' }]);
      const wd = createStreamHealthWatchdog(liveStream, null, {
        consecutiveThreshold: 1,
        gracePeriodMs: 0,
        reconnect: { enabled: false },
        handleVisibilityLifecycle: false,
        onStatusChange: (s) => statuses.push(s),
      }) as WatchdogWithTest;
      try {
        wd._test.clearPollersAndMonitors();
        wd._test.setInitializedAt(performance.now() - 10_000);
        setDocVisibility('hidden');
        wd._test.onVisibilityChange();
        expect(statuses).toContain('paused');
        setDocVisibility('visible');
        statuses.length = 0;
        wd._test.onVisibilityChange();
        vi.advanceTimersByTime(5000);
        expect(statuses.includes('degraded')).toBe(false);
        expect(statuses.includes('failed')).toBe(false);
      } finally {
        wd.destroy();
      }
    });
  }
);
