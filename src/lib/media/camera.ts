export type CameraDevice = { id: string; label: string };

/** Jeda setelah melepaskan kamera (mis. dari pemindai QR) sebelum membuka lagi */
export const CAMERA_RELEASE_DELAY_MS = 700;

/* ──────────────────────────────────────────────────────────────────────────
   Core camera utilities: stream management, single-owner lock, adaptive
   release polling, structured logging, and health watchdog.

   Enable debug traces in DevTools:  localStorage.DEBUG_CAM = '1'
   ─────────────────────────────────────────────────────────────────────── */

type _CameraOwner = { id: string; name: string };
let _cameraOwner: _CameraOwner | null = null;
let _cameraLockPromise: Promise<void> | null = null;
let _cameraLockQueueResolvers: Array<() => void> = [];

const _DEBUG_CAM_KEY = 'DEBUG_CAM';

function _isDebugCamEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const explicit = window.localStorage.getItem(_DEBUG_CAM_KEY) === '1';
    const importMetaDev =
      (import.meta as ImportMeta & { env?: { DEV?: boolean } })?.env?.DEV === true;
    return importMetaDev && explicit;
  } catch {
    return false;
  }
}

export function camLog(event: string, detail?: unknown): void {
  const enabled = _isDebugCamEnabled();
  const ts = new Date().toISOString();
  if (enabled) {
    if (detail !== undefined) {
      console.debug('[CAM]', ts, event, detail);
    } else {
      console.debug('[CAM]', ts, event);
    }
  }
}

export async function acquireCameraLock(ownerName: string, ownerId?: string): Promise<() => void> {
  const id = ownerId ?? `${ownerName}-${Math.random().toString(36).slice(2, 9)}`;
  camLog('lock:request', { owner: ownerName, id, currentOwner: _cameraOwner?.name ?? null });

  const waitMyTurn = async (): Promise<void> => {
    if (!_cameraOwner && !_cameraLockPromise) return;
    await new Promise<void>((resolve) => {
      _cameraLockQueueResolvers.push(resolve);
    });
  };

  while (_cameraOwner || _cameraLockPromise) {
    await waitMyTurn();
  }

  _cameraOwner = { id, name: ownerName };
  let released = false;

  const releaseLock = () => {
    if (released) return;
    released = true;
    if (_cameraOwner?.id === id) {
      camLog('lock:release', { owner: ownerName, id });
      _cameraOwner = null;
      _cameraLockPromise = null;
      const next = _cameraLockQueueResolvers.shift();
      if (next) {
        _cameraLockPromise = (async () => {
          next();
        })().then(() => {
          _cameraLockPromise = null;
        });
      }
    }
  };

  camLog('lock:acquired', { owner: ownerName, id });
  return releaseLock;
}

export function hasCameraLock(ownerId: string): boolean {
  return _cameraOwner?.id === ownerId;
}

export function resetCameraLockForTests(): void {
  _cameraOwner = null;
  _cameraLockPromise = null;
  _cameraLockQueueResolvers = [];
}

const ADAPTIVE_RELEASE_POLL_MS = 150;
const ADAPTIVE_RELEASE_MAX_MS = 3000;
const ADAPTIVE_RELEASE_SETTLE_MS = 150;
const ADAPTIVE_RELEASE_STABLE_POLLS = 2;

export const pickPreferredCameraId = (devices: CameraDevice[], opts?: { preferRear?: boolean }) => {
  if (!devices.length) return null;

  const preferRear = opts?.preferRear !== false;

  const scored = devices.map((d, idx) => {
    const label = (d.label || '').toLowerCase();
    const isBack =
      label.includes('back') ||
      label.includes('rear') ||
      label.includes('environment') ||
      label.includes('belakang');
    const score = preferRear ? (isBack ? 2 : 0) : isBack ? 0 : 2;
    return { id: d.id, idx, score };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored[0]?.id ?? null;
};

// ---------------------------------------------------------------------------
// Global stream registry — tracks every MediaStream opened via getUserMedia
// so we can force-stop all of them when the QR scanner page unmounts.
// ---------------------------------------------------------------------------
const activeStreams = new Set<MediaStream>();

if (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async function (constraints) {
    const reqId = Math.random().toString(36).slice(2, 8);
    const vConst = (constraints as MediaStreamConstraints)?.video;
    camLog('getUserMedia:request', {
      id: reqId,
      hasVideo: Boolean(vConst),
      hasAudio: Boolean((constraints as MediaStreamConstraints)?.audio),
    });
    try {
      const stream = await originalGetUserMedia(constraints);
      activeStreams.add(stream);
      camLog('getUserMedia:success', {
        id: reqId,
        tracks: stream.getTracks().length,
        activeCount: activeStreams.size,
      });

      const removeIfEnded = () => {
        const hasActiveTracks = stream
          .getTracks()
          .some((t: MediaStreamTrack) => t.readyState === 'live');
        if (!hasActiveTracks) {
          activeStreams.delete(stream);
          camLog('stream:ended', { id: reqId, remaining: activeStreams.size });
        }
      };

      stream.getTracks().forEach((t: MediaStreamTrack) => {
        t.addEventListener('ended', removeIfEnded);
      });

      return stream;
    } catch (err) {
      camLog('getUserMedia:fail', { id: reqId, error: (err as Error)?.name ?? String(err) });
      throw err;
    }
  };
}

export function stopAllActiveStreams() {
  const count = activeStreams.size;
  if (count > 0) camLog('streams:stopAll', { count });
  activeStreams.forEach((stream) => {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
  });
  activeStreams.clear();
}

// ---------------------------------------------------------------------------
// Global pending-release promise
// When the QR scanner page (Attend) unmounts it registers a Promise here.
// Any page that wants to open the camera (Excuses) must await this first
// so it does not race with the async QR scanner teardown.
// ---------------------------------------------------------------------------
let _pendingRelease: Promise<void> | null = null;

/** Register a promise that represents an in-progress camera teardown. */
export function registerPendingCameraRelease(p: Promise<void>): void {
  _pendingRelease = p.finally(() => {
    _pendingRelease = null;
  });
}

/** Await any currently-pending camera teardown before proceeding. */
export async function awaitPendingCameraRelease(): Promise<void> {
  if (_pendingRelease) {
    try {
      await _pendingRelease;
    } catch {
      /* ignore errors from the releasing side */
    }
  }
}

export function releaseMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  const tracks = stream.getTracks();
  camLog('stream:release', { tracks: tracks.length });
  tracks.forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

/** Lepaskan semua track video yang masih aktif (pemindaian QR sering meninggalkan lock) */
export async function releaseActiveVideoTracks() {
  let videoCount = 0;
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    void devices;
  } catch {
    /* ignore */
  }
  document.querySelectorAll('video').forEach((el) => {
    const stream = el.srcObject as MediaStream | null;
    if (stream) {
      videoCount++;
      releaseMediaStream(stream);
      el.srcObject = null;
    }
  });
  if (videoCount > 0) camLog('videoElements:cleared', { count: videoCount });
  stopAllActiveStreams();
}

export type CameraErrorCode =
  | 'NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'NOT_READABLE'
  | 'OVERCONSTRAINED'
  | 'ABORT'
  | 'RECOVERING'
  | 'LOCKED'
  | 'UNKNOWN';

export function classifyCameraError(err: unknown): CameraErrorCode {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name ?? '';
  const raw = (e?.message ?? '').toLowerCase();

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'NOT_ALLOWED';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'NOT_FOUND';
  }
  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError' ||
    raw.includes('could not start video source') ||
    raw.includes('failed to allocate videosource')
  ) {
    return 'NOT_READABLE';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'OVERCONSTRAINED';
  }
  if (name === 'AbortError') {
    return 'ABORT';
  }
  if (raw.includes('recovering') || raw.includes('memulihkan')) {
    return 'RECOVERING';
  }
  if (raw.includes('lock') || raw.includes('digunakan') || raw.includes('sedang dipakai')) {
    return 'LOCKED';
  }
  return 'UNKNOWN';
}

export interface DebugCameraSnapshot {
  ua: string;
  lockOwner: string | null;
  activeStreams: number;
  status?: string;
  reconnectAttempt?: number;
  timestamp: string;
}

export function getCameraDebugSnapshot(opts?: {
  status?: string;
  reconnectAttempt?: number;
}): DebugCameraSnapshot {
  return {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
    lockOwner: _cameraOwner?.name ?? null,
    activeStreams: activeStreams.size,
    status: opts?.status,
    reconnectAttempt: opts?.reconnectAttempt,
    timestamp: new Date().toISOString(),
  };
}

export function formatCameraDebugReport(snap: DebugCameraSnapshot): string {
  const lines = [
    '[CAM Debug]',
    `UA: ${snap.ua}`,
    `LockOwner: ${snap.lockOwner ?? 'none'}`,
    `ActiveStreams: ${snap.activeStreams}`,
  ];
  if (snap.status) lines.push(`Status: ${snap.status}`);
  if (snap.reconnectAttempt !== undefined) lines.push(`Attempt: ${snap.reconnectAttempt}`);
  lines.push(`Timestamp: ${snap.timestamp}`);
  return lines.join('\n');
}

export function humanizeCameraError(
  err: unknown,
  opts?: { attempt?: number; max?: number }
): string {
  const e = err as { name?: string; message?: string } | null;
  const raw = (e?.message ?? '').toLowerCase();
  const attempt = opts?.attempt ?? 0;
  const max = opts?.max ?? 3;

  const code = classifyCameraError(err);

  if (code === 'RECOVERING' || (attempt > 0 && max > 0 && code === 'UNKNOWN')) {
    const displayAttempt = Math.max(1, Math.min(attempt, max));
    return `Memulihkan kamera (percobaan ${displayAttempt}/${max})… Mohon tunggu.`;
  }
  if (code === 'LOCKED') {
    return 'Kamera sedang digunakan langkah lain. Menunggu… Jika berlanjut tutup tab lain yang memakai kamera, lalu coba lagi.';
  }
  if (code === 'NOT_ALLOWED') {
    return 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu ketuk Buka Kamera lagi.';
  }
  if (code === 'NOT_FOUND') {
    return 'Tidak ada kamera yang terdeteksi di perangkat ini.';
  }
  if (code === 'NOT_READABLE') {
    return 'Kamera sedang dipakai aplikasi lain atau baru dipakai pemindai QR. Tunggu sebentar, tutup tab lain yang memakai kamera, lalu ketuk Buka Kamera lagi.';
  }
  if (code === 'OVERCONSTRAINED') {
    return 'Pengaturan kamera tidak didukung perangkat ini. Coba ganti kamera depan/belakang.';
  }
  if (code === 'ABORT') {
    return 'Akses kamera dibatalkan. Silakan coba lagi.';
  }
  if (e?.message && !raw.includes('notreadable')) {
    return `Kamera tidak dapat dibuka: ${e.message}`;
  }
  return 'Kamera tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.';
}

export type AcquireCameraOptions = {
  preferRear?: boolean;
  facingMode?: 'user' | 'environment';
  deviceId?: string | null;
};

/** Buka stream kamera dengan fallback dan constraint yang lebih longgar */
export async function acquireCameraStream(opts: AcquireCameraOptions = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser tidak mendukung kamera (gunakan HTTPS).');
  }

  await awaitPendingCameraRelease();

  const preferRear = opts.preferRear ?? opts.facingMode === 'environment';
  let deviceId = opts.deviceId ?? null;
  camLog('acquire:start', {
    preferRear,
    facingMode: opts.facingMode ?? null,
    deviceId: deviceId ?? null,
  });

  if (!deviceId) {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ id: d.deviceId, label: d.label || '' }));
      deviceId = pickPreferredCameraId(videoInputs, { preferRear });
      camLog('acquire:devicePicked', { deviceId: deviceId ?? null, total: videoInputs.length });
    } catch {
      deviceId = null;
    }
  }

  const attempts: MediaStreamConstraints[] = [];

  if (deviceId) {
    attempts.push({
      video: { deviceId: { ideal: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  }
  if (opts.facingMode) {
    attempts.push({
      video: {
        facingMode: { ideal: opts.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }
  attempts.push({ video: { facingMode: { ideal: preferRear ? 'environment' : 'user' } } });
  attempts.push({ video: true });

  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const constraints = attempts[i];
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camLog('acquire:success', { attempt: i + 1, total: attempts.length });
      return stream;
    } catch (err) {
      lastErr = err;
      camLog('acquire:fallback', {
        attempt: i + 1,
        total: attempts.length,
        error: (err as Error)?.name ?? String(err),
      });
    }
  }
  camLog('acquire:fail', { error: (lastErr as Error)?.name ?? String(lastErr) });
  throw lastErr ?? new Error('Gagal membuka kamera');
}

export async function waitForCameraRelease(ms = CAMERA_RELEASE_DELAY_MS) {
  camLog('waitForRelease:start', { minDelayMs: ms });
  await releaseActiveVideoTracks();

  const start = Date.now();
  let labelAvailableStreak = 0;
  let polled = 0;
  let totalWaited = 0;

  const hasAnyLabel = (): boolean => {
    try {
      if (activeStreams.size > 0) return false;
    } catch {
      /* ignore */
    }
    return true;
  };

  const minDelayPromise = new Promise<void>((resolve) => setTimeout(resolve, ms));

  while (totalWaited < ADAPTIVE_RELEASE_MAX_MS) {
    await new Promise<void>((resolve) => setTimeout(resolve, ADAPTIVE_RELEASE_POLL_MS));
    polled++;
    totalWaited = Date.now() - start;

    if (hasAnyLabel()) {
      labelAvailableStreak++;
      if (labelAvailableStreak >= ADAPTIVE_RELEASE_STABLE_POLLS) {
        camLog('waitForRelease:early', { polls: polled, waitedMs: totalWaited });
        break;
      }
    } else {
      labelAvailableStreak = 0;
    }
  }

  if (totalWaited >= ADAPTIVE_RELEASE_MAX_MS) {
    camLog('waitForRelease:timeout', { polls: polled, waitedMs: totalWaited });
  }

  await minDelayPromise;
  await new Promise<void>((r) => setTimeout(r, ADAPTIVE_RELEASE_SETTLE_MS));
  const finalWaited = Date.now() - start;
  camLog('waitForRelease:done', { totalMs: finalWaited });
}

// ---------------------------------------------------------------------------
// Stream Health Watchdog + Auto-Reconnect Manager
// Monitors track/frame/readyState signals and performs 3 reconnect attempts
// with exponential backoff when degradation is detected.
// ---------------------------------------------------------------------------

export type WatchdogStatus = 'healthy' | 'degraded' | 'reconnecting' | 'failed' | 'paused';
export type WatchdogEvent = 'statusChange' | 'reconnectSuccess' | 'reconnectFail';

export interface ReconnectOptions {
  enabled: boolean;
  maxAttempts?: number;
  baseBackoffMs?: number;
  facingMode?: 'user' | 'environment';
  preferRear?: boolean;
  deviceId?: string | null;
}

export interface CreateWatchdogOptions {
  reconnect?: Partial<ReconnectOptions> & {
    onAttempt?: (attempt: number, max: number) => void;
  };
  onStatusChange?: (
    status: WatchdogStatus,
    evt?: { type?: string; stream?: MediaStream | null; reason?: string }
  ) => void;
  frameTimeoutMs?: number;
  trackPollMs?: number;
  readyStatePollMs?: number;
  handleVisibilityLifecycle?: boolean;
  consecutiveThreshold?: number;
  gracePeriodMs?: number;
  preset?: 'qr-scan' | 'photo';
}

type _WatchdogListener<T = unknown> = (payload: T) => void;

export interface StreamWatchdog {
  readonly status: WatchdogStatus;
  readonly reconnectAttempt: number;
  readonly currentStream: MediaStream | null;
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  replaceStream: (stream: MediaStream | null) => void;
  on: <T = unknown>(event: WatchdogEvent, cb: _WatchdogListener<T>) => () => void;
  suspendAutoReconnect: (reason?: string) => void;
  resumeAutoReconnect: () => void;
}

const VIDEO_HAVE_CURRENT_DATA = 2;

const QR_SCAN_PRESET = {
  frameTimeoutMs: 6000,
  trackPollMs: 700,
  readyStatePollMs: 1200,
  consecutiveThreshold: 3,
  gracePeriodMs: 5000,
} as const;

export function createStreamHealthWatchdog(
  initialStream: MediaStream | null,
  videoEl: HTMLVideoElement | null,
  options: CreateWatchdogOptions = {}
): StreamWatchdog {
  const onStatusChangeCb = options.onStatusChange;
  const reconnectOnAttempt = options.reconnect?.onAttempt;
  const reconnectOpts: ReconnectOptions = {
    enabled: options.reconnect?.enabled ?? true,
    maxAttempts: options.reconnect?.maxAttempts ?? 3,
    baseBackoffMs: options.reconnect?.baseBackoffMs ?? 500,
    facingMode: options.reconnect?.facingMode,
    preferRear: options.reconnect?.preferRear,
    deviceId: options.reconnect?.deviceId ?? null,
  };

  const usePreset = options.preset === 'qr-scan' ? QR_SCAN_PRESET : null;

  const FRAME_TIMEOUT_MS = options.frameTimeoutMs ?? usePreset?.frameTimeoutMs ?? 2500;
  const TRACK_POLL_MS = options.trackPollMs ?? usePreset?.trackPollMs ?? 300;
  const RS_POLL_MS = options.readyStatePollMs ?? usePreset?.readyStatePollMs ?? 500;
  const CONSECUTIVE_DEGRADE_THRESHOLD =
    options.consecutiveThreshold ?? usePreset?.consecutiveThreshold ?? 2;
  const GRACE_PERIOD_MS = options.gracePeriodMs ?? usePreset?.gracePeriodMs ?? 0;
  const HANDLE_LIFECYCLE = options.handleVisibilityLifecycle ?? true;

  let status: WatchdogStatus = 'healthy';
  let reconnectAttempt = 0;
  let currentStream: MediaStream | null = initialStream ?? null;
  let destroyed = false;
  let paused = false;
  const currentVideoEl: HTMLVideoElement | null = videoEl ?? null;

  const listeners = new Map<WatchdogEvent, Set<_WatchdogListener>>();

  let trackPollTimer: ReturnType<typeof setInterval> | null = null;
  let rsPollTimer: ReturnType<typeof setInterval> | null = null;
  let frameDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let rvfcCancel: (() => void) | null = null;
  let visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let consecutiveResetTimer: ReturnType<typeof setTimeout> | null = null;
  let degradeSafetyTimer: ReturnType<typeof setTimeout> | null = null;

  let _initializedAt = performance.now();
  let _consecutiveDegradeCount = 0;
  let _reconnectSuspended = false;

  // #region spec-T4 Per-source streak counters
  let _streakTrackEnded = 0;
  let _streakReadyStateLow = 0;
  let _streakFrameTimeout = 0;
  const _resetAllStreaks = (reason: string) => {
    _streakTrackEnded = 0;
    _streakReadyStateLow = 0;
    _streakFrameTimeout = 0;
    camLog('watchdog:streakReset', { reason });
  };
  // #endregion

  const fire = <T>(event: WatchdogEvent, payload: T) => {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch {
        /* ignore listener errors */
      }
    }
  };

  const setStatus = (next: WatchdogStatus, reason?: string) => {
    if (status === next) return;
    status = next;
    if (next === 'healthy') {
      _resetAllStreaks(`setStatus:${reason ?? 'healthy'}`);
    }
    camLog('watchdog:status', { status, reconnectAttempt, reason });
    const payload = { status, reconnectAttempt, reason };
    fire('statusChange', payload);
    try {
      onStatusChangeCb?.(status, { ...payload, type: 'statusChange' });
    } catch {
      /* ignore callback errors */
    }
  };

  // #region debug-point H5:track-poll-history
  let _lastPollTrackEnded = false;
  let _consecutiveEndedCount = 0;
  // #endregion

  const hasEndedTrack = (s: MediaStream | null): boolean => {
    if (!s) return true;
    const tracks = s.getVideoTracks();
    if (tracks.length === 0) return true;
    return tracks.some((t) => t.readyState === 'ended');
  };

  const kickFrameDeadline = (_source: 'timeupdate' | 'self' = 'timeupdate') => {
    if (_source !== 'self') _streakFrameTimeout = 0;
    if (frameDeadlineTimer) clearTimeout(frameDeadlineTimer);
    frameDeadlineTimer = setTimeout(() => {
      if (destroyed || paused) return;
      // #region spec-T4 frameTimeout per-source streak + extra grace
      const ageMs = performance.now() - _initializedAt;
      const EXTRA_GRACE_MS = 500;
      const MIN_STREAK_FRAME = 2;
      _streakFrameTimeout++;
      const belowInitGrace = ageMs < GRACE_PERIOD_MS + EXTRA_GRACE_MS;
      const belowStreak = _streakFrameTimeout < MIN_STREAK_FRAME;
      if (belowInitGrace || belowStreak) {
        camLog('watchdog:degradeSuppressed', {
          reason: belowInitGrace ? 'initGracePeriod' : 'belowPerSourceStreak',
          cause: 'frameTimeout',
          streak: _streakFrameTimeout,
          threshold: MIN_STREAK_FRAME,
          ageMs,
          initGrace: GRACE_PERIOD_MS + EXTRA_GRACE_MS,
        });
        kickFrameDeadline('self');
        return;
      }
      _streakFrameTimeout = 0;
      // #endregion
      // #region debug-point H2:frame-flow-deadline-detail
      try {
        const vid = currentVideoEl;
        const detail = {
          timeoutMs: FRAME_TIMEOUT_MS,
          videoReadyState: vid?.readyState ?? null,
          videoCurrentTime: vid?.currentTime ?? null,
          videoPaused: vid?.paused ?? null,
          videoSeeking: vid?.seeking ?? null,
          trackCount: currentStream?.getTracks().length ?? null,
          videoTracksLive:
            currentStream?.getVideoTracks().filter((t) => t.readyState === 'live').length ?? null,
        };
        camLog('watchdog:frameTimeout', detail);
      } catch {
        camLog('watchdog:frameTimeout', { timeoutMs: FRAME_TIMEOUT_MS });
      }
      // #endregion
      triggerDegrade('frameTimeout');
    }, FRAME_TIMEOUT_MS);
  };

  const installFrameFlowMonitor = () => {
    if (!currentVideoEl) return;
    kickFrameDeadline();

    const onTimeUpdate = () => kickFrameDeadline();
    currentVideoEl.addEventListener('timeupdate', onTimeUpdate, { passive: true });

    const vidAny = currentVideoEl as unknown as {
      requestVideoFrameCallback?: (cb: (now: number, meta: unknown) => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    };
    if (typeof vidAny.requestVideoFrameCallback === 'function') {
      let handle = 0;
      const loop = () => {
        if (destroyed || !currentVideoEl) return;
        kickFrameDeadline();
        handle = vidAny.requestVideoFrameCallback!(loop);
      };
      handle = vidAny.requestVideoFrameCallback(loop);
      rvfcCancel = () => {
        if (currentVideoEl && typeof vidAny.cancelVideoFrameCallback === 'function') {
          try {
            vidAny.cancelVideoFrameCallback(handle);
          } catch {
            /* ignore */
          }
        }
      };
    }

    return () => {
      currentVideoEl?.removeEventListener('timeupdate', onTimeUpdate);
    };
  };

  let cleanupFrameMonitor: (() => void) | null = null;

  const installPollers = () => {
    if (trackPollTimer) clearInterval(trackPollTimer);
    if (rsPollTimer) clearInterval(rsPollTimer);

    trackPollTimer = setInterval(() => {
      if (destroyed || paused) return;
      const endedNow = hasEndedTrack(currentStream);
      // #region spec-T4 track-ended per-source streak
      if (endedNow) {
        _streakTrackEnded++;
      } else {
        if (_streakTrackEnded > 0) {
          camLog('watchdog:streakIgnore', {
            source: 'trackEnded',
            streak: _streakTrackEnded,
            clearedBy: 'nextPollLive',
          });
        }
        _streakTrackEnded = 0;
      }
      const MIN_STREAK_TRACK_ENDED = 2;
      if (_streakTrackEnded >= MIN_STREAK_TRACK_ENDED) {
        _streakTrackEnded = 0;
        // #endregion
        // #region debug-point H5:track-ended-2-poll-consecutive
        try {
          const detail = {
            endedNow,
            consecutiveEndedPolls: _consecutiveEndedCount,
            previousWasEnded: _lastPollTrackEnded,
            transientFlip: false,
            videoTracksLive:
              currentStream?.getVideoTracks().filter((t) => t.readyState === 'live').length ?? null,
            videoTrackCount: currentStream?.getVideoTracks().length ?? null,
          };
          camLog('watchdog:trackPoll', detail);
        } catch {
          /* ignore instrumentation only */
        }
        camLog('watchdog:trackEnded');
        triggerDegrade('trackEnded');
      } else if (endedNow) {
        camLog('watchdog:degradeSuppressed', {
          reason: 'belowPerSourceStreak',
          cause: 'trackEnded',
          streak: _streakTrackEnded,
          threshold: MIN_STREAK_TRACK_ENDED,
        });
      }
      if (_consecutiveEndedCount > 1) {
        /* retain transient-flip debugging (non-fatal) */
      }
      try {
        if (endedNow) _consecutiveEndedCount++;
        else _consecutiveEndedCount = 0;
        const transientCaution = _lastPollTrackEnded && !endedNow;
        _lastPollTrackEnded = endedNow;
        if (endedNow || transientCaution) {
          const detail = {
            endedNow,
            consecutiveEndedPolls: _consecutiveEndedCount,
            previousWasEnded: _lastPollTrackEnded,
            transientFlip: transientCaution,
            videoTracksLive:
              currentStream?.getVideoTracks().filter((t) => t.readyState === 'live').length ?? null,
            videoTrackCount: currentStream?.getVideoTracks().length ?? null,
          };
          camLog('watchdog:trackPoll:instrumentation', detail);
        }
      } catch {
        /* ignore instrumentation only */
      }
      // #endregion
    }, TRACK_POLL_MS);

    rsPollTimer = setInterval(() => {
      if (destroyed || paused || !currentVideoEl) return;
      const rsLowNow = currentVideoEl.readyState < VIDEO_HAVE_CURRENT_DATA;
      // #region spec-T4 readyState per-source streak
      if (rsLowNow) {
        _streakReadyStateLow++;
      } else {
        if (_streakReadyStateLow > 0) {
          camLog('watchdog:streakIgnore', {
            source: 'readyState',
            streak: _streakReadyStateLow,
            clearedBy: 'nextPollReady',
          });
        }
        _streakReadyStateLow = 0;
      }
      const MIN_STREAK_RS = 2;
      if (_streakReadyStateLow >= MIN_STREAK_RS) {
        _streakReadyStateLow = 0;
        // #endregion
        const detail = {
          readyState: currentVideoEl.readyState,
          videoCurrentTime: currentVideoEl.currentTime,
          videoPaused: currentVideoEl.paused,
        };
        camLog('watchdog:readyStateLow', detail);
        triggerDegrade('readyState');
      } else if (rsLowNow) {
        camLog('watchdog:degradeSuppressed', {
          reason: 'belowPerSourceStreak',
          cause: 'readyState',
          streak: _streakReadyStateLow,
          threshold: MIN_STREAK_RS,
        });
      }
    }, RS_POLL_MS);
  };

  const doReconnect = async () => {
    if (!reconnectOpts.enabled) {
      setStatus('failed');
      fire('reconnectFail', { attempt: reconnectAttempt, reason: 'reconnectDisabled' });
      return;
    }
    const max = reconnectOpts.maxAttempts ?? 3;
    if (reconnectAttempt >= max) {
      setStatus('failed');
      fire('reconnectFail', { attempt: reconnectAttempt, reason: 'maxAttempts' });
      return;
    }
    reconnectAttempt++;
    setStatus('reconnecting', 'reconnectAttempt');
    const backoff = (reconnectOpts.baseBackoffMs ?? 500) * Math.pow(2, reconnectAttempt - 1);
    // #region debug-point H4:reconnect-acquire-race
    try {
      const detail = {
        attempt: reconnectAttempt,
        max,
        backoffMs: backoff,
        degradeReason: null,
        currentStreamTracks: currentStream?.getTracks().length ?? null,
        videoElementHasSrcObject: !!currentVideoEl?.srcObject,
        status,
      };
      camLog('watchdog:reconnect', detail);
    } catch {
      camLog('watchdog:reconnect', { attempt: reconnectAttempt, max, backoffMs: backoff });
    }
    // #endregion
    try {
      reconnectOnAttempt?.(reconnectAttempt, max);
    } catch {
      /* ignore */
    }

    try {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      await new Promise<void>((resolve) => {
        reconnectTimer = setTimeout(resolve, backoff);
      });
      if (destroyed || !paused) {
        /* proceed unless fully destroyed */
      }
      if (destroyed) return;

      const prevStreamId = (currentStream as MediaStream & { id?: string })?.id ?? null;
      releaseMediaStream(currentStream);
      currentStream = null;
      if (currentVideoEl) currentVideoEl.srcObject = null;

      const acquireStartedAt = performance.now();
      const newStream = await acquireCameraStream({
        facingMode: reconnectOpts.facingMode,
        preferRear: reconnectOpts.preferRear,
        deviceId: reconnectOpts.deviceId,
      });
      // #region debug-point H4:reconnect-acquire-race
      try {
        const detail = {
          attempt: reconnectAttempt,
          prevStreamId,
          newStreamId: (newStream as MediaStream & { id?: string })?.id ?? null,
          acquireDurationMs: performance.now() - acquireStartedAt,
          newTrackCount: newStream.getTracks().length,
          wasSameStream:
            prevStreamId != null &&
            prevStreamId === ((newStream as MediaStream & { id?: string })?.id ?? null),
        };
        camLog('watchdog:reconnectAcquired', detail);
      } catch {
        /* ignore */
      }
      // #endregion

      currentStream = newStream;
      if (currentVideoEl) {
        currentVideoEl.srcObject = newStream;
        try {
          await currentVideoEl.play();
        } catch {
          /* autoplay policies handled by browser */
        }
      }
      reconnectAttempt = 0;
      // #region spec-CAM-01 Reset grace period for new stream post-reconnect
      _initializedAt = performance.now();
      _resetAllStreaks('reconnectSuccess');
      _consecutiveDegradeCount = 0;
      if (consecutiveResetTimer) {
        clearTimeout(consecutiveResetTimer);
        consecutiveResetTimer = null;
      }
      // #endregion
      setStatus('healthy', 'reconnectSuccess');
      try {
        onStatusChangeCb?.('healthy', { type: 'reconnect_success', stream: newStream });
      } catch {
        /* ignore */
      }
      fire('reconnectSuccess', { stream: newStream });
    } catch (err) {
      camLog('watchdog:reconnectFail', { attempt: reconnectAttempt, error: (err as Error)?.name });
      void doReconnect();
    }
  };

  let degradeInProgress = false;
  const triggerDegrade = (reason: string) => {
    if (degradeInProgress) {
      camLog('watchdog:degradeSuppressed', { reason: 'degradeInProgress', cause: reason });
      return;
    }
    if (destroyed || paused) return;

    if (_reconnectSuspended) {
      camLog('watchdog:degradeSuppressed', { reason: 'suspended', cause: reason });
      return;
    }

    const ageMs = performance.now() - _initializedAt;
    if (ageMs < GRACE_PERIOD_MS) {
      camLog('watchdog:degradeSuppressed', {
        reason: 'gracePeriod',
        cause: reason,
        ageMs,
        gracePeriodMs: GRACE_PERIOD_MS,
      });
      return;
    }

    _consecutiveDegradeCount++;
    if (consecutiveResetTimer) {
      clearTimeout(consecutiveResetTimer);
      consecutiveResetTimer = null;
    }
    consecutiveResetTimer = setTimeout(() => {
      if (_consecutiveDegradeCount > 0) {
        _consecutiveDegradeCount = 0;
        camLog('watchdog:consecutiveCounterReset');
      }
    }, 2000);

    if (_consecutiveDegradeCount < CONSECUTIVE_DEGRADE_THRESHOLD) {
      camLog('watchdog:degradeSuppressed', {
        reason: 'belowThreshold',
        cause: reason,
        count: _consecutiveDegradeCount,
        threshold: CONSECUTIVE_DEGRADE_THRESHOLD,
      });
      return;
    }

    degradeInProgress = true;
    if (degradeSafetyTimer) clearTimeout(degradeSafetyTimer);
    degradeSafetyTimer = setTimeout(() => {
      if (degradeInProgress) {
        camLog('watchdog:degradeSafetyTimeout');
        degradeInProgress = false;
      }
    }, 15000);

    _consecutiveDegradeCount = 0;
    setStatus('degraded');
    fire('statusChange', { status: 'degraded', reason });
    void doReconnect().finally(() => {
      if (degradeSafetyTimer) {
        clearTimeout(degradeSafetyTimer);
        degradeSafetyTimer = null;
      }
      degradeInProgress = false;
    });
  };

  // #region debug-point H1:visibility-throttle-state
  let _lastVisibilityChangeAt = 0;
  let _lastVisibilityState: DocumentVisibilityState | null = null;
  // #endregion

  const onVisibilityChange = () => {
    if (destroyed) return;
    if (typeof document === 'undefined') return;
    const now = performance.now();
    const stateNow = document.visibilityState;
    const deltaFromLastMs = _lastVisibilityChangeAt === 0 ? 0 : now - _lastVisibilityChangeAt;
    // #region debug-point H1:visibility-reporting
    try {
      const detail = {
        state: stateNow,
        previousState: _lastVisibilityState,
        deltaFromLastMs,
        documentHiddenActual: document.hidden,
        hasFocus: typeof document.hasFocus === 'function' ? document.hasFocus() : null,
        windowInnerHeight: typeof window !== 'undefined' ? window.innerHeight : null,
        windowOuterHeight: typeof window !== 'undefined' ? window.outerHeight : null,
        visualViewportHeight:
          typeof window !== 'undefined' &&
          (window as Window & { visualViewport?: { height?: number } }).visualViewport
            ? (window as Window & { visualViewport?: { height?: number } }).visualViewport!.height
            : null,
        falsePositiveCandidate: deltaFromLastMs > 0 && deltaFromLastMs < 1000,
      };
      camLog(
        stateNow === 'hidden' ? 'watchdog:visibilityHidden' : 'watchdog:visibilityVisible',
        detail
      );
    } catch {
      camLog(stateNow === 'hidden' ? 'watchdog:visibilityHidden' : 'watchdog:visibilityVisible', {
        deltaFromLastMs,
      });
    }
    _lastVisibilityChangeAt = now;
    _lastVisibilityState = stateNow;
    // #endregion
    if (stateNow === 'hidden') {
      if (visibilityDebounceTimer) {
        clearTimeout(visibilityDebounceTimer);
        visibilityDebounceTimer = null;
      }
      if (!paused) {
        paused = true;
        setStatus('paused', 'visibilityHidden');
      }
    } else {
      if (paused) {
        paused = false;
        const prev = status === 'paused' ? 'healthy' : status;
        setStatus(prev, 'visibilityVisible');
      }
      if (visibilityDebounceTimer) {
        clearTimeout(visibilityDebounceTimer);
      }
      visibilityDebounceTimer = setTimeout(() => {
        visibilityDebounceTimer = null;
        if (destroyed) return;
        const tracksEnded = hasEndedTrack(currentStream);
        if (tracksEnded && status !== 'reconnecting') {
          camLog('watchdog:visibilityResume:triggerDegrade');
          triggerDegrade('visibilityResumeEndedTracks');
        } else {
          camLog('watchdog:visibilityResume:skip', {
            reason: tracksEnded ? 'statusAlreadyReconnecting' : 'tracksStillLive',
            hasEndedTrack: tracksEnded,
            currentStatus: status,
          });
        }
      }, 3000);
    }
  };

  const onPageHide = () => {
    camLog('watchdog:pagehide');
    if (destroyed) return;
    destroyed = true;
    cleanupAll();
  };

  const installLifecycleListeners = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
  };

  const cleanupAll = () => {
    if (trackPollTimer) {
      clearInterval(trackPollTimer);
      trackPollTimer = null;
    }
    if (rsPollTimer) {
      clearInterval(rsPollTimer);
      rsPollTimer = null;
    }
    if (frameDeadlineTimer) {
      clearTimeout(frameDeadlineTimer);
      frameDeadlineTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (rvfcCancel) {
      rvfcCancel();
      rvfcCancel = null;
    }
    if (cleanupFrameMonitor) {
      cleanupFrameMonitor();
      cleanupFrameMonitor = null;
    }
    if (visibilityDebounceTimer) {
      clearTimeout(visibilityDebounceTimer);
      visibilityDebounceTimer = null;
    }
    if (consecutiveResetTimer) {
      clearTimeout(consecutiveResetTimer);
      consecutiveResetTimer = null;
    }
    if (degradeSafetyTimer) {
      clearTimeout(degradeSafetyTimer);
      degradeSafetyTimer = null;
    }
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    }
    listeners.clear();
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  camLog('watchdog:create', { reconnectEnabled: reconnectOpts.enabled });
  cleanupFrameMonitor = installFrameFlowMonitor() ?? null;
  installPollers();
  if (HANDLE_LIFECYCLE) installLifecycleListeners();

  const api = {
    get status() {
      return status;
    },
    get reconnectAttempt() {
      return reconnectAttempt;
    },
    get currentStream() {
      return currentStream;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      camLog('watchdog:destroy');
      _resetAllStreaks('destroy');
      _consecutiveDegradeCount = 0;
      cleanupAll();
    },
    pause() {
      if (destroyed || paused) return;
      paused = true;
      camLog('watchdog:pause');
      _resetAllStreaks('pause');
      setStatus('paused');
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      camLog('watchdog:resume');
      setStatus(status === 'paused' ? 'healthy' : status);
    },
    replaceStream(stream: MediaStream | null) {
      if (destroyed) return;
      currentStream = stream;
      camLog('watchdog:replaceStream', { hasStream: Boolean(stream) });
    },
    on<T>(event: WatchdogEvent, cb: _WatchdogListener<T>) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb as _WatchdogListener);
      return () => {
        set?.delete(cb as _WatchdogListener);
      };
    },
    suspendAutoReconnect(reason?: string) {
      if (destroyed || _reconnectSuspended) return;
      _reconnectSuspended = true;
      camLog('watchdog:suspendAutoReconnect', { reason: reason ?? null });
    },
    resumeAutoReconnect() {
      if (destroyed || !_reconnectSuspended) return;
      _reconnectSuspended = false;
      camLog('watchdog:resumeAutoReconnect');
    },
    _test: {
      triggerDegrade(reason: string) {
        triggerDegrade(reason);
      },
      onVisibilityChange() {
        onVisibilityChange();
      },
      getConsecutiveCount(): number {
        return _consecutiveDegradeCount;
      },
      isReconnectSuspended(): boolean {
        return _reconnectSuspended;
      },
      getGracePeriodMs(): number {
        return GRACE_PERIOD_MS;
      },
      getConsecutiveThreshold(): number {
        return CONSECUTIVE_DEGRADE_THRESHOLD;
      },
      getInitializedAt(): number {
        return _initializedAt;
      },
      setInitializedAt(value: number) {
        _initializedAt = value;
      },
      clearPollersAndMonitors() {
        if (trackPollTimer) {
          clearInterval(trackPollTimer);
          trackPollTimer = null;
        }
        if (rsPollTimer) {
          clearInterval(rsPollTimer);
          rsPollTimer = null;
        }
        if (frameDeadlineTimer) {
          clearTimeout(frameDeadlineTimer);
          frameDeadlineTimer = null;
        }
        if (cleanupFrameMonitor) {
          cleanupFrameMonitor();
          cleanupFrameMonitor = null;
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      },
    },
  };

  return api as StreamWatchdog;
}

export function createQrScanWatchdog(
  initialStream: MediaStream | null,
  videoEl: HTMLVideoElement | null,
  options: Omit<CreateWatchdogOptions, 'preset'> = {}
): StreamWatchdog {
  return createStreamHealthWatchdog(initialStream, videoEl, {
    ...options,
    preset: 'qr-scan',
  });
}
