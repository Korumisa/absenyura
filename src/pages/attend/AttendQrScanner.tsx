import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from 'sonner';
import { QrCode, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  pickPreferredCameraId,
  waitForCameraRelease,
  releaseActiveVideoTracks,
  registerPendingCameraRelease,
} from '@/lib/media/camera';

type QrErrorType = 'PERMISSION' | 'SCAN_TIMEOUT' | 'BAD_SIG' | 'NOT_ENROLLED';

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
  const [camerasReady, setCamerasReady] = useState(false);
  const [qrBootNonce, setQrBootNonce] = useState(0);
  const [qrFacingMode, setQrFacingMode] = useState<'user' | 'environment'>('environment');
  const [internalQrError, setInternalQrError] = useState<{
    code: QrErrorType;
    detail?: string;
  } | null>(null);

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

  const loadQrCamera = useCallback(
    async (preferRear: boolean) => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        const preferredId = pickPreferredCameraId(
          cameras.map((c) => ({ id: c.id, label: c.label })),
          { preferRear }
        );
        qrCameraIdRef.current = preferredId;
      } catch {
        qrCameraIdRef.current = null;
        const msg = 'Kamera tidak diizinkan. Buka pengaturan browser.';
        setQrError({ code: 'PERMISSION' });
        toast.error(msg);
      } finally {
        setCamerasReady(true);
      }
    },
    [setQrError]
  );

  useEffect(() => {
    loadQrCamera(initialPreferRear);
  }, [loadQrCamera, initialPreferRear]);

  const releaseQrScanner = useCallback(async () => {
    const instance = scannerRef.current;
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
    await waitForCameraRelease();
  }, []);

  useEffect(() => {
    if (!scanning || externalResult || !camerasReady) return;

    const bootGen = ++qrBootGenRef.current;
    let cancelled = false;
    qrDecodedSuccessRef.current = false;

    const clearQrTimeout = () => {
      if (qrDecodeTimeoutRef.current !== null) {
        window.clearTimeout(qrDecodeTimeoutRef.current);
        qrDecodeTimeoutRef.current = null;
      }
    };

    const bootScanner = async () => {
      setQrError(null);
      await waitForCameraRelease(350);
      if (cancelled || bootGen !== qrBootGenRef.current || scannerRef.current) return;

      const cameraConfig: string | MediaTrackConstraints = qrCameraIdRef.current
        ? qrCameraIdRef.current
        : { facingMode: qrFacingMode };

      const qr = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

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
            await releaseQrScanner();
            onScanSuccess(decodedText);
          },
          () => {
            // Abaikan kegagalan scan berulang sampai QR terbaca
          }
        );
        if (cancelled || bootGen !== qrBootGenRef.current) {
          try {
            if (qr.isScanning) await qr.stop();
            qr.clear();
          } catch {
            void 0;
          }
          return;
        }
        scannerRef.current = qr;

        qrDecodeTimeoutRef.current = window.setTimeout(() => {
          if (cancelled || bootGen !== qrBootGenRef.current) return;
          if (qrDecodedSuccessRef.current) return;
          const msg =
            'Tidak dapat membaca kode. Pastikan QR berada di tengah layar dan cahaya cukup.';
          setQrError({ code: 'SCAN_TIMEOUT' });
          toast.error(msg);
          void (async () => {
            try {
              if (qr.isScanning) await qr.stop();
              qr.clear();
            } catch {
              void 0;
            }
            if (scannerRef.current === qr) {
              scannerRef.current = null;
            }
          })();
        }, 15000);
      } catch (err) {
        clearQrTimeout();
        const msg = 'Kamera tidak diizinkan. Buka pengaturan browser.';
        setQrError({ code: 'PERMISSION' });
        toast.error(msg);
        try {
          qr.clear();
        } catch {
          void 0;
        }
      }
    };

    void bootScanner();

    return () => {
      cancelled = true;
      clearQrTimeout();
      qrBootGenRef.current += 1;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        void (async () => {
          try {
            if (instance.isScanning) await instance.stop();
            instance.clear();
          } catch {
            void 0;
          }
          await waitForCameraRelease(200);
        })();
      }
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
  ]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      const instance = scannerRef.current;
      scannerRef.current = null;

      const teardown = (async () => {
        if (instance) {
          try {
            if (instance.isScanning) await instance.stop();
            instance.clear();
          } catch {
            void 0;
          }
        }
        await releaseActiveVideoTracks();
        await new Promise<void>((r) => setTimeout(r, 300));
      })();

      registerPendingCameraRelease(teardown);
    };
  }, []);

  const switchQrCamera = async () => {
    const nextMode = qrFacingMode === 'environment' ? 'user' : 'environment';
    await releaseQrScanner();
    setQrFacingMode(nextMode);
    await loadQrCamera(nextMode === 'environment');
    onQrErrorChange?.(null);
    setQrError(null);
    setScanning(true);
    setQrBootNonce((n) => n + 1);
  };

  return (
    <div className="attend-qr-root w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border-4 border-border bg-slate-900 shadow-2xl border-border">
        <div className="pointer-events-none absolute inset-0 z-10 m-8 rounded-xl border-[3px] border-dashed border-indigo-500/50" />
        <div id="qr-reader" className="min-h-[300px] w-full bg-black" />
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
              {qrError.code === 'PERMISSION' && 'Kamera tidak diizinkan. Buka pengaturan browser.'}
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
                void releaseQrScanner().then(() => {
                  setQrError(null);
                  onQrErrorChange?.(null);
                  setScanning(true);
                  setQrBootNonce((n) => n + 1);
                });
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
