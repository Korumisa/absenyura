import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toastError } from '@/lib/utils/toastMessage';
import { stripHtml5QrDomSignatures } from '@/lib/systemic/stripDomExpandos';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  pickPreferredCameraId,
  waitForCameraRelease,
  releaseActiveVideoTracks,
  registerPendingCameraRelease,
  acquireCameraLock,
  createQrScanWatchdog,
  StreamWatchdog,
  WatchdogStatus,
  camLog,
  humanizeCameraError,
} from '@/lib/media/camera';

type QrErrorType = 'PERMISSION' | 'SCAN_TIMEOUT' | 'BAD_SIG' | 'NOT_ENROLLED';

type Html5QrcodeExtended = Html5Qrcode & {
  pause?: () => unknown;
  isScanning?: boolean;
  _dbgStopExpected?: boolean;
  _dbgControlledMark?: symbol;
};

type WatchdogStatusChangePayload = { status: WatchdogStatus; reconnectAttempt: number };
type WatchdogReconnectPayload = { stream?: MediaStream | null };

type ErrorLike = { message?: unknown };

export interface AttendQrScannerProps {
  scanning: boolean;
  setScanning: React.Dispatch<React.SetStateAction<boolean>>;
  externalResult: string | null;
  onScanSuccess: (decodedText: string) => void;
  resetNonce?: number;
  qrErrorOverride?: { code: QrErrorType; detail?: string } | null;
  onQrErrorChange?: (err: { code: QrErrorType; detail?: string } | null) => void;
  initialPreferRear?: boolean;
}

export default function AttendQrScanner({
  scanning,
  setScanning,
  externalResult,
  onScanSuccess,
  resetNonce = 0,
  qrErrorOverride,
  onQrErrorChange,
  initialPreferRear = true,
}: AttendQrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCameraIdRef = useRef<string | null>(null);
  const qrBootGenRef = useRef(0);
  const qrDecodeTimeoutRef = useRef<number | null>(null);
  const qrDecodedSuccessRef = useRef(false);
  const qrReleasedRef = useRef(false);
  const qrStartInFlightRef = useRef<Promise<Html5Qrcode | null> | null>(null);
  const qrSwitchingRef = useRef(false);
  const qrWatchdogRef = useRef<StreamWatchdog | null>(null);
  const qrLockReleaseRef = useRef<(() => void) | null>(null);
  const qrPrevOnErrorRef = useRef<OnErrorEventHandlerNonNull | null>(null);
  const qrUnhandledHandlerRef = useRef<((ev: PromiseRejectionEvent) => void) | null>(null);
  const qrCaptureErrorHandlerRef = useRef<((ev: ErrorEvent) => void) | null>(null);
  const qrReconnectingRef = useRef(false);
  const qrWdStatusDebounceRef = useRef<number | null>(null);

  const [camerasReady, setCamerasReady] = useState(false);
  const [qrBootNonce, setQrBootNonce] = useState(0);
  const [qrFacingMode, setQrFacingMode] = useState<'user' | 'environment'>('environment');
  const [internalQrError, setInternalQrError] = useState<{
    code: QrErrorType;
    detail?: string;
  } | null>(null);
  const [qrWatchdogStatus, setQrWatchdogStatus] = useState<WatchdogStatus>('healthy');

  const qrError = qrErrorOverride !== undefined ? qrErrorOverride : internalQrError;

  const setQrError = useCallback(
    (err: { code: QrErrorType; detail?: string } | null) => {
      if (onQrErrorChange) {
        onQrErrorChange(err);
      }
      setInternalQrError(err);
    },
    [onQrErrorChange]
  );

  const loadQrCamera = useCallback(async (preferRear: boolean) => {
    try {
      // Prefer enumerateDevices — Html5Qrcode.getCameras() opens a temporary
      // stream just to list devices, which causes open→close→open flicker
      // before the real scanner starts.
      if (!navigator.mediaDevices?.enumerateDevices) {
        qrCameraIdRef.current = null;
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ id: d.deviceId, label: d.label || '' }));
      const hasLabels = videoInputs.some((d) => d.label);
      // Without labels (permission not yet granted), fall back to facingMode
      // so qr.start() requests permission once — not twice.
      qrCameraIdRef.current = hasLabels ? pickPreferredCameraId(videoInputs, { preferRear }) : null;
    } catch {
      qrCameraIdRef.current = null;
    } finally {
      setCamerasReady(true);
    }
  }, []);

  useEffect(() => {
    loadQrCamera(initialPreferRear);
  }, [loadQrCamera, initialPreferRear]);

  const cleanupQrWatchdog = useCallback(() => {
    const wd = qrWatchdogRef.current;
    if (wd) {
      wd.destroy();
      qrWatchdogRef.current = null;
    }
    if (qrWdStatusDebounceRef.current !== null) {
      window.clearTimeout(qrWdStatusDebounceRef.current);
      qrWdStatusDebounceRef.current = null;
    }
    setQrWatchdogStatus('healthy');
  }, []);

  const releaseQrScanner = useCallback(
    async (opts?: { force?: boolean }) => {
      if (qrReleasedRef.current && !opts?.force) return;
      qrReleasedRef.current = true;
      camLog('qr:releaseScanner', { forced: Boolean(opts?.force) });

      // ── Cleanup watchdog first (prevent mid-reconnect) ──
      cleanupQrWatchdog();

      // ── Release pending lock (if any) ──
      if (qrLockReleaseRef.current) {
        try {
          qrLockReleaseRef.current();
        } catch {
          /* ignore */
        }
        qrLockReleaseRef.current = null;
      }

      // ── In-flight qr.start() guard: ensure teardown after resolves ──
      const inFlight = qrStartInFlightRef.current;
      let resolvedInstance: Html5Qrcode | null = null;
      if (inFlight) {
        try {
          resolvedInstance = await inFlight.catch(() => null);
        } catch {
          resolvedInstance = null;
        }
        qrStartInFlightRef.current = null;
      }

      const instance = scannerRef.current ?? resolvedInstance;
      if (instance) {
        try {
          if (instance.isScanning) {
            await instance.stop();
          }
          instance.clear();
        } catch {
          void 0;
        }
        scannerRef.current = null;
      }
      // ── Uninstall 3-tier global noise catcher ────────────────────────────────
      if (qrCaptureErrorHandlerRef.current) {
        window.removeEventListener(
          'error',
          qrCaptureErrorHandlerRef.current as unknown as EventListener,
          true
        );
        qrCaptureErrorHandlerRef.current = null;
      }
      if (qrUnhandledHandlerRef.current) {
        window.removeEventListener(
          'unhandledrejection',
          qrUnhandledHandlerRef.current as unknown as EventListener
        );
        qrUnhandledHandlerRef.current = null;
      }
      if (qrPrevOnErrorRef.current !== null) {
        try {
          window.onerror = qrPrevOnErrorRef.current;
        } catch {
          void 0;
        }
        qrPrevOnErrorRef.current = null;
      }
      stripHtml5QrDomSignatures('qr-reader');
      await waitForCameraRelease();
    },
    [cleanupQrWatchdog]
  );

  useEffect(() => {
    if (!scanning || externalResult || !camerasReady) return;

    const bootGen = ++qrBootGenRef.current;
    let cancelled = false;
    qrDecodedSuccessRef.current = false;
    let localLockRelease: (() => void) | null = null;

    const clearQrTimeout = () => {
      if (qrDecodeTimeoutRef.current !== null) {
        window.clearTimeout(qrDecodeTimeoutRef.current);
        qrDecodeTimeoutRef.current = null;
      }
    };

    const attachQrWatchdog = () => {
      try {
        const videoEl = document.querySelector<HTMLVideoElement>('#qr-reader video');
        const stream = (videoEl?.srcObject as MediaStream | null) ?? null;
        if (!videoEl || !stream) return;

        cleanupQrWatchdog();

        const wd = createQrScanWatchdog(stream, videoEl, {
          reconnect: {
            enabled: true,
            facingMode: qrFacingMode,
            preferRear: qrFacingMode === 'environment',
            deviceId: qrCameraIdRef.current,
          },
        });
        wd.on('statusChange', ({ status, reconnectAttempt }: WatchdogStatusChangePayload) => {
          // #region spec-T5 Debounce 700ms trailing edge — kec reconnectAttempt>1 reconnecting
          // (real recovery progress — user harus tahu segera)
          const isRealReconnect = status === 'reconnecting' && reconnectAttempt > 1;
          const apply = () => {
            setQrWatchdogStatus(status);
            if (isRealReconnect) {
              toast.info(
                humanizeCameraError(
                  { message: 'recovering' },
                  { attempt: reconnectAttempt, max: 3 }
                ),
                { id: 'qr-wd-recover' }
              );
            }
          };
          if (qrWdStatusDebounceRef.current !== null) {
            window.clearTimeout(qrWdStatusDebounceRef.current);
            qrWdStatusDebounceRef.current = null;
          }
          if (isRealReconnect) {
            apply();
          } else {
            qrWdStatusDebounceRef.current = window.setTimeout(apply, 700);
          }
          // #endregion
        });
        wd.on('reconnectSuccess', (payload: WatchdogReconnectPayload) => {
          void handleQrAwareReconnect(payload, videoEl);
        });
        wd.on('reconnectFail', () => {
          const errMsg = humanizeCameraError({ message: 'lock' });
          setQrError({ code: 'PERMISSION', detail: errMsg });
          toastError(null, errMsg);
        });
        qrWatchdogRef.current = wd;
        setQrWatchdogStatus(wd.status);
      } catch {
        /* watchdog install failure is non-fatal */
      }
    };

    const handleQrAwareReconnect = async (
      payload: { stream?: MediaStream | null },
      videoEl: HTMLVideoElement
    ) => {
      if (qrReconnectingRef.current) {
        camLog('qr:reconnect_reEntrant_skip');
        return;
      }
      qrReconnectingRef.current = true;
      const bootGen = qrBootGenRef.current;
      try {
        camLog('qr:awareReconnect_start', { generation: bootGen });

        cleanupQrWatchdog();

        const instance = scannerRef.current;
        if (instance) {
          try {
            (instance as Html5QrcodeExtended)._dbgStopExpected = true;
            if (instance.isScanning) {
              await instance.stop().catch(() => undefined);
            }
            instance.clear();
          } catch {
            /* ignore */
          }
          scannerRef.current = null;
        }
        stripHtml5QrDomSignatures('qr-reader');

        const newStream = (payload as { stream?: MediaStream | null })?.stream ?? null;
        if (newStream && videoEl) {
          try {
            videoEl.srcObject = newStream;
            await videoEl.play().catch(() => undefined);
          } catch {
            /* ignore */
          }
        }

        await waitForCameraRelease(200);
        if (bootGen !== qrBootGenRef.current) return;

        const cameraConfig: string | MediaTrackConstraints = qrCameraIdRef.current
          ? qrCameraIdRef.current
          : { facingMode: qrFacingMode };

        const qrNew = new Html5Qrcode('qr-reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        try {
          const originalStop: Html5Qrcode['stop'] = qrNew.stop.bind(qrNew);
          const originalPause = (qrNew as Html5QrcodeExtended).pause?.bind(qrNew);
          const originalClear: Html5Qrcode['clear'] = qrNew.clear.bind(qrNew);
          (qrNew as Html5QrcodeExtended)._dbgStopExpected = false;

          (qrNew as Html5QrcodeExtended).stop = async function wrappedStop(
            this: Html5Qrcode
          ): Promise<void> {
            const stack = new Error('qr_stop_capture').stack ?? '';
            const fromControlled =
              stack.includes('releaseQrScanner') ||
              stack.includes('bootScanner') ||
              stack.includes('catch') ||
              stack.includes('e =') ||
              stack.includes('handleQrAwareReconnect') ||
              (this as Html5QrcodeExtended)._dbgStopExpected === true;
            camLog('html5qrcode:stopCalled', {
              stack: stack.split('\n').slice(1, 6).join(' | '),
              fromControlledOwner: fromControlled,
              generation: bootGen,
            });
            if (!fromControlled) {
              camLog('html5qrcode:internal_stop', { generation: bootGen });
              qrWatchdogRef.current?.suspendAutoReconnect('html5qrcode-internal-stop-uncontrolled');
            } else {
              qrWatchdogRef.current?.suspendAutoReconnect('html5qrcode-internal-stop-controlled');
            }
            try {
              return await originalStop();
            } finally {
              if (fromControlled) qrWatchdogRef.current?.resumeAutoReconnect();
            }
          } as Html5Qrcode['stop'];

          if (typeof originalPause === 'function') {
            (qrNew as Html5QrcodeExtended).pause = function wrappedPause(
              this: Html5QrcodeExtended
            ) {
              const stack = new Error('qr_pause_capture').stack ?? '';
              camLog('html5qrcode:pauseCalled', {
                stack: stack.split('\n').slice(1, 5).join(' | '),
                generation: bootGen,
              });
              qrWatchdogRef.current?.suspendAutoReconnect('html5qrcode-internal-pause');
              try {
                return originalPause();
              } finally {
                qrWatchdogRef.current?.resumeAutoReconnect();
              }
            };
          }

          (qrNew as Html5QrcodeExtended).clear = function wrappedClear(this: Html5Qrcode): void {
            const stack = new Error('qr_clear_capture').stack ?? '';
            const fromControlled =
              stack.includes('releaseQrScanner') ||
              stack.includes('bootScanner') ||
              stack.includes('catch') ||
              stack.includes('handleQrAwareReconnect');
            camLog('html5qrcode:clearCalled', {
              stack: stack.split('\n').slice(1, 6).join(' | '),
              fromControlledOwner: fromControlled,
              generation: bootGen,
            });
            return originalClear();
          } as Html5Qrcode['clear'];
        } catch {
          /* instrumentation non-fatal */
        }

        const startP = (async () => {
          try {
            await qrNew.start(
              cameraConfig,
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: qrFacingMode === 'user',
              },
              async (decodedText) => {
                if (bootGen !== qrBootGenRef.current) return;
                qrDecodedSuccessRef.current = true;
                if (qrDecodeTimeoutRef.current !== null) {
                  window.clearTimeout(qrDecodeTimeoutRef.current);
                  qrDecodeTimeoutRef.current = null;
                }
                const releaseP = (async () => {
                  await releaseQrScanner();
                })();
                registerPendingCameraRelease(releaseP);
                await releaseP;
                onScanSuccess(decodedText);
              },
              () => {}
            );
            return qrNew;
          } catch (e) {
            try {
              if ((qrNew as Html5QrcodeExtended)?.isScanning)
                await (qrNew as Html5QrcodeExtended).stop().catch(() => undefined);
              (qrNew as Html5QrcodeExtended)?.clear?.();
            } catch {
              /* ignore */
            }
            throw e;
          }
        })();

        qrStartInFlightRef.current = startP;
        const resolved = await startP.catch(() => null);
        qrStartInFlightRef.current = null;

        if (bootGen !== qrBootGenRef.current || !resolved) {
          camLog('qr:awareReconnect_staleGeneration', {
            expected: bootGen,
            actual: qrBootGenRef.current,
          });
          return;
        }
        scannerRef.current = resolved;

        if (qrDecodeTimeoutRef.current !== null) {
          window.clearTimeout(qrDecodeTimeoutRef.current);
        }
        qrDecodeTimeoutRef.current = window.setTimeout(() => {
          if (bootGen !== qrBootGenRef.current) return;
          if (qrDecodedSuccessRef.current) return;
          const msg =
            'Tidak dapat membaca kode. Pastikan QR berada di tengah layar dan cahaya cukup.';
          setQrError({ code: 'SCAN_TIMEOUT' });
          toastError(null, msg);
          void releaseQrScanner().catch(() => undefined);
        }, 15000);

        requestAnimationFrame(() => {
          if (bootGen !== qrBootGenRef.current) return;
          attachQrWatchdog();
        });

        camLog('qr:awareReconnect_success', { generation: bootGen });
      } catch (err) {
        camLog('qr:awareReconnect_fail', { error: (err as Error)?.name ?? String(err) });
        qrDecodedSuccessRef.current = false;
        void releaseQrScanner().catch(() => undefined);
        const msg = humanizeCameraError({ message: 'lock' });
        setQrError({ code: 'PERMISSION', detail: msg });
        toastError(null, msg);
      } finally {
        qrReconnectingRef.current = false;
      }
    };

    const bootScanner = async () => {
      setQrError(null);
      qrReleasedRef.current = false;

      try {
        localLockRelease = await acquireCameraLock('qr-scanner', `qr-${bootGen}`);
        qrLockReleaseRef.current = localLockRelease;
      } catch (lockErr) {
        camLog('qr:lockFailed', { error: (lockErr as Error)?.name });
        const msg = humanizeCameraError({ message: 'lock' });
        setQrError({ code: 'PERMISSION', detail: msg });
        toastError(null, msg);
        return;
      }

      const isAbortNoise = (raw: string): boolean => {
        const s = String(raw || '').toLowerCase();
        return (
          /onabort/.test(s) ||
          /renderedcamera/i.test(raw) ||
          /video surface/.test(raw) ||
          s.includes('canceled') ||
          s.includes('aborted')
        );
      };

      if (!qrCaptureErrorHandlerRef.current) {
        const h = (ev: ErrorEvent): void => {
          const errObj = (ev.error ?? null) as ErrorLike | null;
          const msg = String(ev.message || (errObj && errObj.message) || '');
          if (isAbortNoise(msg)) {
            try {
              ev.preventDefault();
              ev.stopPropagation();
              ev.stopImmediatePropagation?.();
            } catch {
              void 0;
            }
          }
        };
        qrCaptureErrorHandlerRef.current = h;
        window.addEventListener('error', h as unknown as EventListener, true);
      }

      if (!qrUnhandledHandlerRef.current) {
        const h = (ev: PromiseRejectionEvent): void => {
          const reasonAny = (ev.reason ?? null) as ErrorLike | { error?: unknown } | null;
          const msg = String(
            (reasonAny && ('message' in reasonAny ? reasonAny.message : null)) ||
              (reasonAny && ('error' in reasonAny ? reasonAny.error : null)) ||
              reasonAny ||
              ''
          );
          if (isAbortNoise(msg)) {
            try {
              ev.preventDefault();
            } catch {
              void 0;
            }
          }
        };
        qrUnhandledHandlerRef.current = h;
        window.addEventListener('unhandledrejection', h as unknown as EventListener);
      }

      if (qrPrevOnErrorRef.current === null) {
        const prev = window.onerror;
        qrPrevOnErrorRef.current = prev as OnErrorEventHandlerNonNull | null;
        window.onerror = function (
          this: OnErrorEventHandlerNonNull,
          msg,
          src,
          lineno,
          colno,
          err
        ): boolean {
          const errMsg = (err ?? null) as ErrorLike | null;
          const combined = `${msg} ${errMsg && errMsg.message ? errMsg.message : ''}`;
          if (isAbortNoise(combined)) {
            return true;
          }
          if (prev) {
            return prev.call(this, msg, src, lineno, colno, err);
          }
          return false;
        };
      }

      await waitForCameraRelease(350);
      if (cancelled || bootGen !== qrBootGenRef.current || scannerRef.current) return;

      await new Promise<void>((r) => setTimeout(r, 120));
      if (cancelled || bootGen !== qrBootGenRef.current || scannerRef.current) return;

      const cameraConfig: string | MediaTrackConstraints = qrCameraIdRef.current
        ? qrCameraIdRef.current
        : { facingMode: qrFacingMode };

      const qr = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      // #region debug-point H3:html5qrcode-stop-contention-detector
      // Wrap instance methods stop()/pause()/clear() to detect html5-qrcode INTERNAL contention
      // If call stack NOT includes releaseQrScanner or L369 catch handler → owner mismatch = H3
      // RC-6 FIX: also suspend watchdog during internal pause/stop operations
      try {
        const originalStop: Html5Qrcode['stop'] = qr.stop.bind(qr);
        const originalPause = (qr as Html5QrcodeExtended).pause?.bind(qr);
        const originalClear: Html5Qrcode['clear'] = qr.clear.bind(qr);
        const controlledMark = Symbol('controlled-release-qr-scanner');
        (qr as Html5QrcodeExtended)._dbgControlledMark = controlledMark;
        qr.stop = async function wrappedStop(this: Html5Qrcode): Promise<void> {
          const stack = new Error('qr_stop_capture').stack ?? '';
          const fromControlled =
            stack.includes('releaseQrScanner') ||
            stack.includes('bootScanner') ||
            stack.includes('catch') ||
            stack.includes('e =') ||
            stack.includes('handleQrAwareReconnect') ||
            (this as Html5QrcodeExtended)._dbgStopExpected === true;
          camLog('html5qrcode:stopCalled', {
            stack: stack.split('\n').slice(1, 6).join(' | '),
            fromControlledOwner: fromControlled,
            isScanningNow: (this as Html5QrcodeExtended).isScanning,
            generation: bootGen,
          });
          if (!fromControlled) {
            camLog('html5qrcode:internal_stop', {
              stack: stack.split('\n').slice(1, 10).join('\n'),
              generation: bootGen,
            });
            qrWatchdogRef.current?.suspendAutoReconnect('html5qrcode-internal-stop-uncontrolled');
          } else {
            qrWatchdogRef.current?.suspendAutoReconnect('html5qrcode-internal-stop-controlled');
          }
          try {
            return await originalStop();
          } finally {
            if (fromControlled) {
              qrWatchdogRef.current?.resumeAutoReconnect();
            }
          }
        } as Html5Qrcode['stop'];
        if (typeof originalPause === 'function') {
          (qr as Html5QrcodeExtended).pause = function wrappedPause(this: Html5QrcodeExtended) {
            const stack = new Error('qr_pause_capture').stack ?? '';
            camLog('html5qrcode:pauseCalled', {
              stack: stack.split('\n').slice(1, 5).join(' | '),
              generation: bootGen,
            });
            qrWatchdogRef.current?.suspendAutoReconnect('html5qrcode-internal-pause');
            try {
              return originalPause();
            } finally {
              qrWatchdogRef.current?.resumeAutoReconnect();
            }
          };
        }
        qr.clear = function wrappedClear(this: Html5Qrcode): void {
          const stack = new Error('qr_clear_capture').stack ?? '';
          const fromControlled =
            stack.includes('releaseQrScanner') ||
            stack.includes('bootScanner') ||
            stack.includes('catch') ||
            stack.includes('handleQrAwareReconnect');
          camLog('html5qrcode:clearCalled', {
            stack: stack.split('\n').slice(1, 6).join(' | '),
            fromControlledOwner: fromControlled,
            generation: bootGen,
          });
          if (!fromControlled) {
            camLog('html5qrcode:internal_stop', {
              type: 'clear',
              stack: stack.split('\n').slice(1, 10).join('\n'),
              generation: bootGen,
            });
          }
          return originalClear();
        } as Html5Qrcode['clear'];
      } catch {
        /* instrumentation failure non-fatal */
      }
      // #endregion

      const startPromise: Promise<Html5Qrcode | null> = (async () => {
        try {
          await qr.start(
            cameraConfig,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              disableFlip: qrFacingMode === 'user',
            },
            async (decodedText) => {
              if (cancelled || bootGen !== qrBootGenRef.current) return;
              qrDecodedSuccessRef.current = true;
              clearQrTimeout();
              // Immediately register pending release so Attend.tsx startCamera awaits us
              const releaseP = (async () => {
                await releaseQrScanner();
              })();
              registerPendingCameraRelease(releaseP);
              await releaseP;
              onScanSuccess(decodedText);
            },
            () => {
              /* repeat scan failures are expected until a valid QR is presented */
            }
          );
          return qr;
        } catch (e) {
          try {
            if (qr?.isScanning) await qr.stop().catch(() => undefined);
            qr?.clear?.();
          } catch {
            /* ignore */
          }
          throw e;
        }
      })();

      qrStartInFlightRef.current = startPromise;

      try {
        const resolvedQr = await startPromise;
        qrStartInFlightRef.current = null;
        if (cancelled || bootGen !== qrBootGenRef.current) {
          await releaseQrScanner();
          return;
        }
        scannerRef.current = resolvedQr ?? null;

        // Attach watchdog AFTER html5-qrcode has attached its own video.srcObject
        requestAnimationFrame(() => {
          if (cancelled || bootGen !== qrBootGenRef.current) return;
          attachQrWatchdog();
        });

        qrDecodeTimeoutRef.current = window.setTimeout(() => {
          if (cancelled || bootGen !== qrBootGenRef.current) return;
          if (qrDecodedSuccessRef.current) return;
          const msg =
            'Tidak dapat membaca kode. Pastikan QR berada di tengah layar dan cahaya cukup.';
          setQrError({ code: 'SCAN_TIMEOUT' });
          toastError(null, msg);
          void releaseQrScanner().catch(() => {
            void 0;
          });
        }, 15000);
      } catch {
        qrStartInFlightRef.current = null;
        clearQrTimeout();
        const msg = 'Kamera tidak diizinkan. Buka pengaturan browser.';
        setQrError({ code: 'PERMISSION' });
        toastError(null, msg);
        void releaseQrScanner().catch(() => {
          void 0;
        });
      }
    };

    void bootScanner().catch((_e) => {
      void _e;
    });

    return () => {
      cancelled = true;
      clearQrTimeout();
      qrBootGenRef.current += 1;
      void (async () => {
        await releaseQrScanner();
        await waitForCameraRelease(200);
      })().catch(() => {
        void 0;
      });
    };
  }, [
    scanning,
    externalResult,
    camerasReady,
    qrFacingMode,
    qrBootNonce,
    resetNonce,
    releaseQrScanner,
    onScanSuccess,
    setQrError,
    cleanupQrWatchdog,
  ]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      const teardown = (async () => {
        // Always cleanup watchdog + noise catchers on unmount regardless of state,
        // but only release stream if not already released (prevents double-release)
        cleanupQrWatchdog();
        if (qrLockReleaseRef.current) {
          try {
            qrLockReleaseRef.current();
          } catch {
            /* ignore */
          }
          qrLockReleaseRef.current = null;
        }
        if (!qrReleasedRef.current) {
          qrReleasedRef.current = true;
          const inFlight = qrStartInFlightRef.current;
          let instFromFlight: Html5Qrcode | null = null;
          if (inFlight) {
            try {
              instFromFlight = await inFlight.catch(() => null);
            } catch {
              instFromFlight = null;
            }
            qrStartInFlightRef.current = null;
          }
          const instance = scannerRef.current ?? instFromFlight;
          scannerRef.current = null;
          if (instance) {
            try {
              if (instance.isScanning) await instance.stop();
              instance.clear();
            } catch {
              void 0;
            }
          }
          try {
            stripHtml5QrDomSignatures('qr-reader');
          } catch {
            void 0;
          }
          await releaseActiveVideoTracks();
        }
        // Always uninstall 3-tier global abort-catcher on full unmount, even if stream already released
        if (qrCaptureErrorHandlerRef.current) {
          window.removeEventListener(
            'error',
            qrCaptureErrorHandlerRef.current as unknown as EventListener,
            true
          );
          qrCaptureErrorHandlerRef.current = null;
        }
        if (qrUnhandledHandlerRef.current) {
          window.removeEventListener(
            'unhandledrejection',
            qrUnhandledHandlerRef.current as unknown as EventListener
          );
          qrUnhandledHandlerRef.current = null;
        }
        if (qrPrevOnErrorRef.current !== null) {
          try {
            window.onerror = qrPrevOnErrorRef.current;
          } catch {
            void 0;
          }
          qrPrevOnErrorRef.current = null;
        }
        await new Promise<void>((r) => setTimeout(r, 300));
      })();

      registerPendingCameraRelease(teardown);
    };
  }, [cleanupQrWatchdog]);

  const switchQrCamera = async () => {
    if (qrSwitchingRef.current) return;
    qrSwitchingRef.current = true;
    try {
      const nextMode = qrFacingMode === 'environment' ? 'user' : 'environment';
      const lock = await acquireCameraLock('qr-switch', `qrsw-${Date.now()}`);
      try {
        await releaseQrScanner({ force: true });
        setQrFacingMode(nextMode);
        await loadQrCamera(nextMode === 'environment');
        onQrErrorChange?.(null);
        setQrError(null);
        setScanning(true);
        setQrBootNonce((n) => n + 1);
      } finally {
        lock();
      }
    } finally {
      qrSwitchingRef.current = false;
    }
  };

  const showWatchdogIndicator =
    !qrError &&
    scanning &&
    (qrWatchdogStatus === 'reconnecting' || qrWatchdogStatus === 'degraded');

  return (
    <div className="attend-qr-root w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border-4 border-border bg-slate-900 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 z-10 m-8 rounded-xl border-[3px] border-dashed border-indigo-500/50" />
        <div id="qr-reader" className="min-h-[300px] w-full bg-black" />
        {showWatchdogIndicator && (
          <div
            className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-amber-200 ring-1 ring-amber-400/40 backdrop-blur-sm">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              <span>
                Memulihkan kamera
                {qrWatchdogRef.current?.reconnectAttempt
                  ? ` (${qrWatchdogRef.current.reconnectAttempt}/3)`
                  : ''}
                …
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8 space-y-4 text-center">
        {qrError ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-semibold">
              {qrError.code === 'PERMISSION' && 'Kamera tidak diizinkan'}
              {qrError.code === 'SCAN_TIMEOUT' && 'Tidak dapat membaca kode QR'}
              {qrError.code === 'BAD_SIG' && 'Kode QR tidak valid'}
              {qrError.code === 'NOT_ENROLLED' && 'Tidak terdaftar di sesi ini'}
            </p>
            <p className="mt-1">
              {qrError.code === 'PERMISSION' &&
              qrError.detail &&
              (qrError.detail.includes('izin') || qrError.detail.includes('digunakan'))
                ? qrError.detail
                : qrError.code === 'PERMISSION'
                  ? 'Kamera tidak diizinkan. Buka pengaturan browser.'
                  : null}
              {qrError.code === 'PERMISSION' &&
                !qrError.detail &&
                'Kamera tidak diizinkan. Buka pengaturan browser.'}
              {qrError.code === 'SCAN_TIMEOUT' &&
                'Tidak dapat membaca kode. Pastikan QR berada di tengah layar dan cahaya cukup.'}
              {qrError.code === 'BAD_SIG' && 'Kode QR tidak valid atau sudah digunakan.'}
              {qrError.code === 'NOT_ENROLLED' &&
                `Anda tidak terdaftar di sesi ini (Kode: ${qrError.detail ?? '-'}). Pindai kode sesi aktif Anda.`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-11"
              onClick={() => {
                void (async () => {
                  const lock = await acquireCameraLock('qr-retry', `qrrt-${Date.now()}`);
                  try {
                    await releaseQrScanner({ force: true });
                    setQrError(null);
                    onQrErrorChange?.(null);
                    setScanning(true);
                    setQrBootNonce((n) => n + 1);
                  } finally {
                    lock();
                  }
                })();
              }}
            >
              Coba Lagi
            </Button>
          </div>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            Arahkan kamera ke QR Code yang ditampilkan oleh Dosen.
          </p>
        )}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => void switchQrCamera()}
            disabled={qrSwitchingRef.current}
            className="min-h-11 gap-2"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Kamera QR {qrFacingMode === 'environment' ? 'Belakang' : 'Depan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
