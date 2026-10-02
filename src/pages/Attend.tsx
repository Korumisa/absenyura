import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { getRateLimitedUntilMs, clearRateLimitCooldown } from '@/services/api';
import { toast } from 'sonner';
import {
  toastError,
  toastSuccess,
  toastSuccessMessage,
  toastInfo,
  toastWarning,
} from '@/lib/utils/toastMessage';
import {
  MapPin,
  QrCode,
  ShieldAlert,
  Camera,
  RefreshCw,
  WifiOff,
  AlertCircle,
  LogOut,
  Loader2,
  Clock,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Report } from '@/types/report';
import {
  APP_ONLINE_EVENT,
  OFFLINE_USER_MESSAGE,
  ONLINE_USER_MESSAGE,
} from '@/lib/perf/networkEvents';
import { attendanceError, attendanceFeedback } from '@/lib/http/attendanceError';
import { parseAttendanceQr } from '@/lib/http/attendanceQr';
import { AttendPrivacyBanner } from '@/components/attend/AttendPrivacyBanner';
import { track } from '@vercel/analytics';
import { getDeviceFingerprint } from '@/lib/storage/deviceFingerprint';
import {
  acquireCameraStream,
  awaitPendingCameraRelease,
  humanizeCameraError,
  releaseMediaStream,
  waitForCameraRelease,
  releaseActiveVideoTracks,
  registerPendingCameraRelease,
  acquireCameraLock,
  createStreamHealthWatchdog,
  camLog,
} from '@/lib/media/camera';
import type { StreamWatchdog, WatchdogStatus } from '@/lib/media/camera';
import { drawCaptureWatermark } from '@/lib/media/drawCaptureWatermark';
import { encodeAttendancePhoto, prepareAttendancePhoto } from '@/lib/media/imageUpload';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { useAuthStore } from '@/stores/authStore';

import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { AttendStepIndicator } from '@/components/attend/AttendStepIndicator';

const AttendQrScanner = lazy(() => import('@/pages/attend/AttendQrScanner'));
const AttendLocationMap = lazy(() => import('@/pages/attend/AttendLocationMap'));

const getDistanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

// ─── Module-level dedup in-flight check-in requests ──────────────────────────
// Shared Map: key = `${userId}:${sessionId}`. Jika permintaan sama sedang
// berjalan (TTL 45 detik), skip request KEDUA (cegah double-submit → HTTP 429).
type InflightEntry = { expiresAt: number; controller: AbortController };
const CHECKIN_INFLIGHT = new Map<string, InflightEntry>();

const getStickyErrorKey = (sessionId: string | null) =>
  `absenyura:sticky_submit_error:${sessionId ?? '-'}`;

// ─── Rate-aware retry button with countdown ──────────────────────────────────
// Menampilkan tombol "Coba kirim lagi" yang otomatis disabled + menampilkan
// countdown detik tersisa jika rate limit dari api.ts masih aktif.
function RateAwareRetryButton(props: {
  loading: boolean;
  onClick: () => void;
  transient: boolean;
}) {
  const { loading, onClick, transient } = props;
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const rateLimitUntil = getRateLimitedUntilMs();
  const remainMs = rateLimitUntil - Date.now();
  const isRateLimited = remainMs > 0;
  const remainSec = Math.max(1, Math.ceil(remainMs / 1000));

  const disabled = loading || isRateLimited;
  const borderClass = transient ? 'border-amber-300' : 'border-red-300';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`mt-3 min-h-11 ${borderClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isRateLimited ? (
        <>
          <Loader2 className="mr-2 size-3 animate-spin" aria-hidden="true" />
          Tunggu {remainSec} detik
        </>
      ) : loading ? (
        <>
          <Loader2 className="mr-2 size-3 animate-spin" aria-hidden="true" />
          Mengirim…
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 size-3" aria-hidden="true" />
          Coba kirim lagi
        </>
      )}
    </Button>
  );
}

export default function Attend() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionParam = searchParams.get('session');
  const tokenParam = searchParams.get('token');
  const isCheckoutMode = searchParams.get('checkout') === 'true'; // [UX] A-01, D-02
  const attendanceParam = searchParams.get('attendance');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [qrValidating, setQrValidating] = useState(false);
  const qrValidationGeneration = React.useRef(0);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleBrowserOnline = () => setIsOffline(false);
    const handleBrowserOffline = () => setIsOffline(true);
    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);

  // Camera state for photo evidence
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const photoProcessingRef = React.useRef(false);
  const captureGenerationRef = React.useRef(0);
  useEffect(() => {
    return () => {
      captureGenerationRef.current += 1;
    };
  }, []);
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pendingStreamRef = React.useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  type QrErrorType = 'PERMISSION' | 'SCAN_TIMEOUT' | 'BAD_SIG' | 'NOT_ENROLLED';
  const [qrError, setQrError] = useState<{ code: QrErrorType; detail?: string } | null>(null);
  const [qrResetNonce, setQrResetNonce] = useState(0);
  const isSubmittingRef = React.useRef(false);

  const extractSessionIdAndToken = (rawResult: string | null) => {
    const parsed = rawResult ? parseAttendanceQr(rawResult, sessionParam) : null;
    return { sid: parsed?.sessionId ?? sessionParam, tkn: parsed?.token ?? null };
  };

  const { sid: derivedSessionId, tkn: parsedToken } = extractSessionIdAndToken(scanResult);

  // ── Smart submit error state ─────────────────────────────────────────────────
  // `transient` = pesan tidak disimpan sebagai sticky (tidak dimunculkan lagi ketika
  // user keluar → masuk aplikasi). `sticky` = error yang DIPERTAHANKAN lintas lifecycle
  // halaman (sesuai requirement: error HANYA muncul ketika user keluar aplikasi lalu
  // masuk kembali; TIDAK muncul pada percobaan submit ulang di halaman yang sama).
  type SubmitError = {
    message: string;
    hint?: string;
    transient?: boolean;
    statusCode?: number;
  };
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const handleQrScanSuccess = useCallback(
    async (decodedText: string) => {
      const generation = ++qrValidationGeneration.current;
      const parsed = parseAttendanceQr(decodedText, sessionParam);
      setScanResult(null);
      setPhotoBlob(null);
      setPhotoPreview(null);
      setSubmitError(null);
      setQrError(null);
      setQrValidating(false);
      if (!parsed) {
        setScanning(true);
        setQrResetNonce((n) => n + 1);
        setQrError({ code: 'BAD_SIG', detail: 'Pindai QR untuk sesi yang dipilih.' });
        return;
      }
      setScanning(false);
      setQrValidating(true);
      try {
        await api.post('/attendance/verify-qr', {
          session_id: parsed.sessionId,
          qr_token: parsed.token,
          action: isCheckoutMode ? 'checkout' : 'checkin',
        });
        if (generation !== qrValidationGeneration.current) return;
        setScanResult(decodedText);
        setScanning(false);
        setCheckoutError(null);
        try {
          sessionStorage.removeItem(getStickyErrorKey(parsed.sessionId));
        } catch {
          // Browsing without storage remains supported.
        }
      } catch (error) {
        if (generation !== qrValidationGeneration.current) return;
        const { message } = attendanceError(error);
        setQrError({ code: 'BAD_SIG', detail: message });
        setScanning(true);
        setQrResetNonce((n) => n + 1);
        toastError(null, message);
      } finally {
        if (generation === qrValidationGeneration.current) setQrValidating(false);
      }
    },
    [sessionParam, isCheckoutMode]
  );

  useEffect(() => {
    if (tokenParam) void handleQrScanSuccess(tokenParam);
    return () => {
      qrValidationGeneration.current += 1;
    };
  }, [tokenParam, handleQrScanSuccess]);

  // ── User visibility guard untuk sticky error ─────────────────────────────────
  // HANYA ketika visibility hidden→visible (user balik dari tab/aplikasi lain),
  // kita restore submitError yang tersimpan di sessionStorage.
  const sessionKey = useMemo(() => getStickyErrorKey(derivedSessionId), [derivedSessionId]);

  useEffect(() => {
    // Cleanup TTL checker: setiap 15 detik hapus entry in-flight yang sudah kedaluwarsa
    const timer = window.setInterval(() => {
      const now = Date.now();
      CHECKIN_INFLIGHT.forEach((entry, key) => {
        if (entry.expiresAt < now) CHECKIN_INFLIGHT.delete(key);
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      // Requirement: HANYA tampilkan sticky error ketika user balik ke aplikasi
      // (bukan saat tombol di-klik, bukan saat halaman baru mount).
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as SubmitError;
        if (parsed && typeof parsed.message === 'string') {
          setSubmitError({
            message: attendanceFeedback(parsed.statusCode, parsed.message).message,
            statusCode: parsed.statusCode,
            transient: false,
          });
        }
      } catch {
        /* corrupted sessionStorage value — ignore */
      }
      try {
        clearRateLimitCooldown();
      } catch {
        /* noop */
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [sessionKey]);

  // ── Helper: persist/clear sticky error ───────────────────────────────────────
  const persistErrorIfSticky = useCallback(
    (err: SubmitError | null) => {
      try {
        if (err && !err.transient) {
          sessionStorage.setItem(
            sessionKey,
            JSON.stringify({ message: err.message, hint: err.hint, statusCode: err.statusCode })
          );
        } else if (err === null) {
          sessionStorage.removeItem(sessionKey);
        }
      } catch {
        /* noop */
      }
    },
    [sessionKey]
  );

  const photoWatchdogRef = React.useRef<StreamWatchdog | null>(null);
  const photoLockReleaseRef = React.useRef<(() => void) | null>(null);
  const photoSwitchingRef = React.useRef(false);
  const [photoWatchdogStatus, setPhotoWatchdogStatus] = useState<WatchdogStatus>('healthy');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(sessionParam && !tokenParam));
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null); // [UX] A-03
  const [myAttendance, setMyAttendance] = useState<Pick<
    Report,
    'id' | 'check_in_time' | 'session_title'
  > | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(isCheckoutMode);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const sessionIdForLoad = isCheckoutMode ? sessionParam : derivedSessionId;

  const reloadSession = useCallback(async () => {
    if (!sessionIdForLoad) {
      setSessionLoading(false);
      return;
    }
    if (isOffline && !isCheckoutMode) {
      setSessionLoading(false);
      return;
    }

    setSessionLoading(true);
    setSessionLoadError(null);

    try {
      const res = await api.get(`/sessions/${sessionIdForLoad}`);
      const s = res.data.data;
      setSessionDetails(s);
    } catch (err) {
      const msg = attendanceError(err).message;
      setSessionLoadError(msg);
      setSessionDetails(null);
    } finally {
      setSessionLoading(false);
    }
  }, [sessionIdForLoad, isCheckoutMode, isOffline]);

  useEffect(() => {
    void reloadSession();
  }, [reloadSession]);

  const reloadCheckout = useCallback(async () => {
    if (!isCheckoutMode || !sessionParam) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await api.get('/reports', { params: { sessionId: sessionParam, limit: 5 } });
      const rows: Report[] = res.data?.data ?? [];
      const match =
        rows.find((r) => r.id === attendanceParam) ??
        rows.find((r) => r.session_id === sessionParam) ??
        null;
      if (!match) {
        setCheckoutError('Data check-in tidak ditemukan. Pastikan Anda sudah absen di sesi ini.');
        setMyAttendance(null);
        return;
      }
      setMyAttendance({
        id: match.id,
        check_in_time: match.check_in_time,
        session_title: match.session_title,
      });
    } catch (err) {
      setCheckoutError(attendanceError(err).message);
    } finally {
      setCheckoutLoading(false);
    }
  }, [isCheckoutMode, sessionParam, attendanceParam]);

  useEffect(() => {
    if (isCheckoutMode) void reloadCheckout();
  }, [isCheckoutMode, reloadCheckout]);

  useEffect(() => {
    const resumeAfterOnline = () => {
      setIsOffline(false);
      setSubmitError(null);
      toast.success(toastSuccessMessage(ONLINE_USER_MESSAGE), { id: 'attend-online' });
      void reloadSession();
      if (isCheckoutMode) void reloadCheckout();
    };
    window.addEventListener(APP_ONLINE_EVENT, resumeAfterOnline);
    return () => window.removeEventListener(APP_ONLINE_EVENT, resumeAfterOnline);
  }, [reloadSession, reloadCheckout, isCheckoutMode]);

  useEffect(() => {
    const checkInCloseAt = sessionDetails?.check_in_close_at;
    if (!checkInCloseAt || isOffline) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const startInterval = () => {
      if (interval) return;
      interval = setInterval(() => setNowTick(Date.now()), 30_000);
    };
    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNowTick(Date.now());
        startInterval();
      } else {
        stopInterval();
      }
    };
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') startInterval();
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopInterval();
      if (typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [sessionDetails, isOffline]);

  const handleCheckOut = async () => {
    if (!myAttendance?.id || isSubmittingRef.current || checkoutSubmitting || isOffline) return;
    if (!location || !gpsAccuracy || gpsAccuracy <= 0) {
      toastError(null, 'Menunggu lokasi GPS yang valid…');
      return;
    }
    if (!photoBlob) {
      toastError(null, 'Silakan ambil foto bukti check-out terlebih dahulu.');
      return;
    }
    const sessionId = sessionIdForLoad?.trim();
    if (!sessionId) {
      toastError(null, 'Sesi tidak ditemukan.');
      return;
    }
    if (!scanResult || qrValidating) {
      toastError(null, 'Silakan scan QR Code terlebih dahulu.');
      return;
    }

    isSubmittingRef.current = true;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const { tkn: qrToken } = extractSessionIdAndToken(scanResult);
      const uploadPhoto = await prepareAttendancePhoto(photoBlob);
      const photoType = uploadPhoto.type;
      const challengeRes = await api.get('/attendance/challenge', {
        params: {
          action: 'checkout',
          attendance_id: myAttendance.id,
          session_id: sessionId,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: gpsAccuracy,
          photo_size: uploadPhoto.size,
          photo_type: photoType,
        },
      });
      const nonce = challengeRes.data?.data?.nonce;
      const signature = challengeRes.data?.data?.signature;
      if (!nonce || !signature) {
        throw new Error(attendanceFeedback(503).message);
      }

      const deviceFingerprint = await getDeviceFingerprint();
      const formData = new FormData();
      if (qrToken) {
        formData.append('qr_token', qrToken);
      }
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('accuracy', gpsAccuracy.toString());
      formData.append('device_fingerprint', deviceFingerprint);
      formData.append('nonce', nonce);
      formData.append('signature', signature);
      formData.append('photo_size', uploadPhoto.size.toString());
      formData.append('photo_type', photoType);
      formData.append('photo', uploadPhoto, 'checkout.jpg');

      const idempotencyKey = crypto.randomUUID();
      await api.put(`/attendance/${myAttendance.id}/check-out`, formData, {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });
      toastSuccess('Check-out berhasil!');
      navigate('/dashboard');
    } catch (err) {
      const feedback = attendanceError(err);
      const msg = feedback.message;
      if (feedback.code.startsWith('QR_')) {
        setScanResult(null);
        setScanning(true);
        setPhotoBlob(null);
        setPhotoPreview(null);
      }
      setCheckoutError(msg);
      toastError(null, msg);
    } finally {
      isSubmittingRef.current = false;
      setCheckoutSubmitting(false);
    }
  };

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => setIpAddress(data.ip))
      .catch(() => setIpAddress(''));
  }, []);

  const isSpoofedLocation = (pos: GeolocationPosition) => {
    // Basic heuristics for web-based fake GPS
    // 1. Extremely low accuracy that is highly unusual for real devices
    if (pos.coords.accuracy !== null && pos.coords.accuracy < 2) {
      return true;
    }
    // 2. Suspiciously round coordinates often seen in emulators
    if (pos.coords.latitude % 1 === 0 && pos.coords.longitude % 1 === 0) {
      return true;
    }
    return false;
  };

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    if (isSpoofedLocation(pos)) {
      setGpsError('Terdeteksi aplikasi Fake GPS atau anomali lokasi.');
      toastError(null, 'Lokasi ditolak: Terdeteksi aplikasi Fake GPS.');
      setLocation(null);
      return;
    }

    const acc = pos.coords.accuracy;
    setGpsAccuracy(acc);

    if (acc > 150) {
      setGpsError(`Akurasi lokasi terlalu rendah (${Math.round(acc)}m). Silakan ke area terbuka.`);
      toastWarning('Akurasi lokasi rendah. Cari tempat terbuka.');
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      return;
    }

    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setGpsError(null);
  }, []);

  const requestLocationOnce = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung Geolocation');
      toastError(null, 'Browser Anda tidak mendukung Geolocation.');
      return;
    }
    setGpsError(null);
    toast.loading('Meminta izin lokasi GPS…', { id: 'gps-loc' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss('gps-loc');
        handlePosition(pos);
      },
      (err) => {
        toast.dismiss('gps-loc');
        setGpsError(err.message || 'Gagal mendapatkan lokasi GPS');
        toastError(null, 'Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [handlePosition]);

  const hasIpRestriction = Boolean(sessionDetails?.location?.ip_restriction_enabled);

  const isIpValid = () => {
    if (!hasIpRestriction) return true;
    return Boolean(ipAddress);
  };

  useEffect(() => {
    requestLocationOnce();
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        setGpsError(err.message || 'Gagal mendapatkan lokasi GPS');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [handlePosition, requestLocationOnce]);

  const stopCamera = () => {
    try {
      photoWatchdogRef.current?.destroy();
    } catch (e) {
      camLog('photo_stop_watchdog_err', { err: e });
    } finally {
      photoWatchdogRef.current = null;
      setPhotoWatchdogStatus('healthy');
    }
    try {
      photoLockReleaseRef.current?.();
    } catch (e) {
      camLog('photo_stop_lock_err', { err: e });
    } finally {
      photoLockReleaseRef.current = null;
    }
    if (pendingStreamRef.current) {
      releaseMediaStream(pendingStreamRef.current);
      pendingStreamRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      releaseMediaStream(videoRef.current.srcObject as MediaStream);
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive && pendingStreamRef.current && videoRef.current) {
      const stream = pendingStreamRef.current;
      pendingStreamRef.current = null;
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    }
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
      const teardown = (async () => {
        await releaseActiveVideoTracks();
        await new Promise<void>((r) => setTimeout(r, 300));
      })();
      registerPendingCameraRelease(teardown);
    };
  }, []);

  const startCamera = useCallback(
    async (mode = facingMode) => {
      if (!scanResult || qrValidating) return;
      if (photoSwitchingRef.current) return;
      if (
        isCameraActive &&
        !photoSwitchingRef.current &&
        pendingStreamRef.current &&
        videoRef.current &&
        videoRef.current.srcObject &&
        mode === facingMode
      ) {
        camLog('photo_start_skip_idempotent');
        setCameraStarting(false);
        setPhotoWatchdogStatus('healthy');
        return;
      }
      photoSwitchingRef.current = true;
      setCameraStarting(true);
      setCameraPermissionError(null);
      setPhotoWatchdogStatus('reconnecting');
      try {
        stopCamera();
        await awaitPendingCameraRelease();
        await waitForCameraRelease(400);

        const ownerTag = `attend-photo-${derivedSessionId || sessionParam || tokenParam || 'checkout-mode'}`;
        photoLockReleaseRef.current = await acquireCameraLock(ownerTag);

        let lastErr: unknown;
        for (let attempt = 0; attempt < 4; attempt++) {
          if (attempt > 0) {
            await waitForCameraRelease(700 + attempt * 350);
          }
          try {
            camLog('photo_start_attempt', { mode, attempt });
            const stream = await acquireCameraStream({
              facingMode: mode,
              preferRear: mode === 'environment',
            });
            pendingStreamRef.current = stream;
            setIsCameraActive(true);

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                try {
                  const wd = createStreamHealthWatchdog(stream, videoRef.current, {
                    reconnect: {
                      maxAttempts: 3,
                      facingMode: mode,
                      onAttempt: (n, max) => {
                        setPhotoWatchdogStatus('reconnecting');
                        if (n >= 2) {
                          toastInfo(`Memulihkan kamera (${n}/${max})…`);
                        }
                      },
                    },
                    onStatusChange: (status, evt) => {
                      setPhotoWatchdogStatus(status);
                      if (evt?.type === 'reconnect_success') {
                        const restored = evt.stream as MediaStream | null;
                        if (restored && videoRef.current && !videoRef.current.srcObject) {
                          videoRef.current.srcObject = restored;
                          videoRef.current.play().catch(() => undefined);
                        }
                      }
                      if (status === 'failed') {
                        setCameraPermissionError(
                          'Kamera terputus permanen. Tutup tab lain yang memakai kamera, lalu tekan "Buka Kamera".'
                        );
                        toastError(
                          null,
                          'Kamera tidak dapat dipulihkan otomatis. Silakan tekan "Buka Kamera" kembali.'
                        );
                      }
                    },
                  });
                  photoWatchdogRef.current = wd;
                  setPhotoWatchdogStatus(wd.status);
                } catch (wdErr) {
                  camLog('photo_watchdog_create_err', { err: wdErr });
                }
              });
            });
            return;
          } catch (err) {
            lastErr = err;
          }
        }

        photoLockReleaseRef.current?.();
        photoLockReleaseRef.current = null;
        const msg = humanizeCameraError(lastErr);
        setCameraPermissionError(msg);
        toastError(null, msg);
        setPhotoWatchdogStatus('failed');
      } finally {
        photoSwitchingRef.current = false;
        setCameraStarting(false);
      }
    },
    [
      facingMode,
      derivedSessionId,
      sessionParam,
      tokenParam,
      isCameraActive,
      scanResult,
      qrValidating,
    ]
  );

  const switchCamera = () => {
    if (photoSwitchingRef.current) return;
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isCameraActive) {
      void startCamera(newMode);
    }
  };

  const takePhoto = async () => {
    if (photoProcessingRef.current) return;
    photoProcessingRef.current = true;
    setPhotoProcessing(true);
    const generation = captureGenerationRef.current;
    try {
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Kamera belum siap. Buka kamera lalu coba lagi.');
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Calculate scaled dimensions to prevent massive payloads
      const MAX_WIDTH = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (!width || !height) {
        throw new Error('Kamera belum siap. Tunggu pratinjau kamera lalu ambil foto lagi.');
      }

      const scale = Math.min(1, MAX_WIDTH / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Foto belum dapat diproses. Silakan buka ulang kamera.');
      // Unmirrored capture so proof matches reality; live preview uses CSS scaleX(-1).
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const watermarkLines = [`${new Date().toLocaleString()}`];
      if (location) {
        watermarkLines.push(`Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`);
      }
      drawCaptureWatermark(ctx, watermarkLines, { bottomY: canvas.height - 10 });

      const blob = await encodeAttendancePhoto(canvas);
      if (generation !== captureGenerationRef.current) return;
      setPhotoBlob(blob);
      setPhotoPreview(URL.createObjectURL(blob));
      stopCamera();
    } catch {
      if (generation === captureGenerationRef.current) {
        toastError(
          null,
          'Foto belum dapat diproses. Tunggu pratinjau kamera lalu ambil foto ulang.'
        );
      }
    } finally {
      photoProcessingRef.current = false;
      if (generation === captureGenerationRef.current) {
        setPhotoProcessing(false);
      }
    }
  };

  const retakePhoto = () => {
    stopCamera();
    setPhotoBlob(null);
    setPhotoPreview(null);
    void startCamera();
  };

  const handleCheckIn = async () => {
    if (isSubmittingRef.current) return;
    if (isOffline || !navigator.onLine) {
      toastError(null, 'Sambungkan internet sebelum mengirim absensi. Data belum terkirim.');
      return;
    }
    if (gpsError) {
      toastError(null, `GPS bermasalah: ${gpsError}`);
      return;
    }
    if (!scanResult || qrValidating) {
      toastError(null, 'Silakan scan QR Code terlebih dahulu.');
      return;
    }
    if (!location) {
      toastError(null, 'Menunggu lokasi GPS...');
      return;
    }
    if (!gpsAccuracy || gpsAccuracy <= 0) {
      toastError(null, 'Menunggu akurasi GPS yang valid...');
      return;
    }
    // We require photo evidence for this iteration as requested
    if (!photoBlob) {
      toastError(null, 'Silakan ambil foto bukti terlebih dahulu.');
      return;
    }

    let sessionId = derivedSessionId;
    if (!sessionId) {
      toastError(null, 'Sesi tidak ditemukan dalam QR Code atau URL.');
      return;
    }
    sessionId = sessionId.trim();

    // ── Client-side rate-limit guard (P0 MENGHINDARI 429 SEBELUM TERJADI) ─────
    const rateLimitUntil = getRateLimitedUntilMs();
    if (rateLimitUntil > Date.now()) {
      const remainSec = Math.ceil((rateLimitUntil - Date.now()) / 1000);
      toastWarning(
        `Tunggu ${remainSec} detik sebelum mengirim ulang (server membatasi permintaan).`
      );
      return;
    }

    // ── Module-level dedup in-flight guard ──────────────────────────────────
    // Dua klik berturut-turut atau double-submit akan menyebabkan 429 di server.
    // Cegah sebelum request dikirim: jika (userId:sessionId) masih inflight → skip.
    // NOTE: deviceFingerprint belum tersedia di titik ini (async call), jadi gunakan
    // userId jika login, atau fallback ke fingerprint nanti jika perlu.
    const authState = useAuthStore.getState();
    const userIdForGuard = (authState.user?.id as string | undefined) ?? 'anon-user';
    const dedupKey = `${userIdForGuard}:${sessionId}`;
    const existingInFlight = CHECKIN_INFLIGHT.get(dedupKey);
    if (existingInFlight && existingInFlight.expiresAt > Date.now()) {
      toastInfo('Permintaan absensi Anda sedang diproses. Harap tunggu hasilnya...');
      return;
    }
    const abortController = new AbortController();
    CHECKIN_INFLIGHT.set(dedupKey, {
      expiresAt: Date.now() + 45_000,
      controller: abortController,
    });
    const clearInflight = () => {
      const stored = CHECKIN_INFLIGHT.get(dedupKey);
      if (stored && stored.controller === abortController) {
        CHECKIN_INFLIGHT.delete(dedupKey);
      }
    };

    isSubmittingRef.current = true;
    setLoading(true);
    setSubmitError(null);
    persistErrorIfSticky(null);
    try {
      const uploadPhoto = await prepareAttendancePhoto(photoBlob);
      const qrToken = parsedToken;
      const deviceFingerprint = await getDeviceFingerprint();

      // --- ANTI-CHEAT LAYER 2: Request server-signed one-time proof ---
      const photoType = uploadPhoto.type;
      const challengeRes = await api.get('/attendance/challenge', {
        params: {
          action: 'checkin',
          session_id: sessionId,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: gpsAccuracy,
          photo_size: uploadPhoto.size,
          photo_type: photoType,
        },
      });
      const nonce = challengeRes.data?.data?.nonce;
      const signature = challengeRes.data?.data?.signature;
      if (!nonce || !signature) {
        throw new Error(attendanceFeedback(503).message);
      }

      const formData = new FormData();
      formData.append('session_id', sessionId);
      if (qrToken) {
        formData.append('qr_token', qrToken);
      }
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('accuracy', (gpsAccuracy || 0).toString());
      formData.append('ip_address', ipAddress);
      formData.append('device_fingerprint', deviceFingerprint);
      formData.append('nonce', nonce);
      formData.append('signature', signature);
      formData.append('photo_size', uploadPhoto.size.toString());
      formData.append('photo_type', photoType);

      formData.append('photo', uploadPhoto, 'attendance.jpg');

      const idempotencyKey = crypto.randomUUID();
      await api.post('/attendance/check-in', formData, {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });

      toastSuccess('Check-in berhasil!');
      track('checkin_success');
      navigate('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { error?: unknown; retry_after_ms?: number } };
        code?: string;
        message?: string;
      };
      const statusCode = axiosError.response?.status;
      const feedback = attendanceError(error);
      const apiMsg = feedback.message;
      const serverMsg = apiMsg;
      const lower = apiMsg.toLowerCase();
      const lowerServer = serverMsg.toLowerCase();
      const isBadSigQrError = feedback.code.startsWith('QR_');
      const isNotEnrolled = feedback.code === 'NOT_ENROLLED';
      const photoMissing = feedback.code === 'PHOTO_INVALID';

      // ── Klasifikasi error: transient (retryable) vs sticky (persisten) ──
      // Transient = coba lagi nanti, TIDAK disimpan ke sticky sessionStorage
      // Sticky    = butuh intervensi user / admin, disimpan dan ditampilkan
      //             HANYA ketika user balik ke tab (visibilitychange)
      const isTransient =
        statusCode === 429 ||
        statusCode === 503 ||
        statusCode === 408 ||
        statusCode === 502 ||
        statusCode === 504 ||
        axiosError.code === 'ECONNABORTED' ||
        axiosError.code === 'ERR_NETWORK' ||
        photoMissing;

      if (isNotEnrolled) {
        const code = derivedSessionId || '-';
        const notEnrolledMsg = apiMsg;
        setScanResult(null);
        setScanning(true);
        setPhotoBlob(null);
        setPhotoPreview(null);
        setQrError({ code: 'NOT_ENROLLED', detail: code });
        toastError(null, notEnrolledMsg);
        const errObj: SubmitError = {
          message: notEnrolledMsg,
          hint: 'Kemungkinan QR Code salah sesi atau Anda belum didaftarkan pada kelas ini.',
          transient: false,
          statusCode,
        };
        setSubmitError(errObj);
        persistErrorIfSticky(errObj);
      } else if (isBadSigQrError) {
        const badSigMsg = apiMsg;
        setScanResult(null);
        setScanning(true);
        setPhotoBlob(null);
        setPhotoPreview(null);
        setQrError({ code: 'BAD_SIG', detail: apiMsg });
        const errObj: SubmitError = {
          message: badSigMsg,
          hint: 'Scan ulang QR Code dari layar dosen, lalu lanjutkan langkah berikutnya.',
          transient: true,
          statusCode,
        };
        setSubmitError(errObj);
        persistErrorIfSticky(errObj);
        toastError(null, badSigMsg);
      } else if (photoMissing) {
        const photoMsg = apiMsg;
        setPhotoBlob(null);
        setPhotoPreview(null);
        const errObj: SubmitError = {
          message: photoMsg,
          hint: 'Klik tombol "Ambil Foto Bukti" untuk menangkap foto ulang, lalu kirim lagi.',
          transient: true,
          statusCode,
        };
        setSubmitError(errObj);
        persistErrorIfSticky(errObj);
        toastWarning(photoMsg);
      } else if (isTransient) {
        let hint = 'Periksa koneksi internet, tunggu beberapa detik, lalu tekan "Coba kirim lagi".';
        if (statusCode === 429) {
          hint = 'Server membatasi permintaan. Tunggu sebentar lalu coba kirim lagi.';
          toastWarning('Batas permintaan tercapai, tunggu sebentar.');
        } else if (statusCode === 503) {
          const retryMs = axiosError.response?.data?.retry_after_ms;
          const retrySec =
            typeof retryMs === 'number' && Number.isFinite(retryMs)
              ? Math.max(1, Math.min(300, Math.ceil(retryMs / 1000)))
              : 30;
          hint = `Layanan sedang sibuk. Coba lagi dalam ${retrySec} detik.`;
          toastWarning(`Tunggu ${retrySec} detik sebelum mencoba lagi.`);
        } else if (photoMissing) {
          hint = 'Ambil foto bukti ulang lalu kirim lagi.';
        }
        const errObj: SubmitError = {
          message: apiMsg,
          hint,
          transient: true,
          statusCode,
        };
        setSubmitError(errObj);
        persistErrorIfSticky(errObj);
        if (statusCode !== 429 && statusCode !== 503) {
          toastError(null, apiMsg);
        }
      } else {
        // Sticky error default: 403 device mismatch, 404 session gone, 500 with traceId
        const isDeviceMismatch =
          lowerServer.includes('perangkat') ||
          lower.includes('device') ||
          lower.includes('fingerprint');
        const isSessionGone =
          statusCode === 404 ||
          (lowerServer.includes('sesi') &&
            (lowerServer.includes('dihapus') || lowerServer.includes('tidak ditemukan')));
        let hint = 'Catat waktu kejadian dan hubungi admin jika masalah berlanjut.';
        if (isDeviceMismatch) {
          hint =
            'Gunakan perangkat yang terdaftar pada akun Anda. Hubungi admin untuk mengganti perangkat.';
        } else if (isSessionGone) {
          hint = 'Sesi kelas sudah berakhir atau dihapus oleh dosen. Scan QR Code sesi yang baru.';
        }
        const errObj: SubmitError = {
          message: apiMsg,
          hint,
          transient: false,
          statusCode,
        };
        setSubmitError(errObj);
        persistErrorIfSticky(errObj);
        toastError(null, apiMsg);
      }
    } finally {
      clearInflight();
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const isLocationValid = () => {
    if (!location || !sessionDetails?.location) return false;
    const dist = getDistanceMeters(location, {
      lat: sessionDetails.location.latitude,
      lng: sessionDetails.location.longitude,
    });
    return dist <= sessionDetails.location.radius;
  };

  const getAbsensiWindowStatus = (): {
    label: string;
    tone: 'green' | 'amber' | 'red' | 'muted';
    labelName: string;
  } => {
    const labelName = isCheckoutMode ? 'Waktu Check-out' : 'Waktu Absensi';
    if (isOffline) return { label: 'Waktu: Gunakan WiFi', tone: 'muted', labelName };
    if (!sessionDetails) return { label: 'Menunggu…', tone: 'muted', labelName };
    const openAt = sessionDetails.check_in_open_at
      ? new Date(sessionDetails.check_in_open_at).getTime()
      : null;
    const closeAt = sessionDetails.check_in_close_at
      ? new Date(sessionDetails.check_in_close_at).getTime()
      : null;
    const now = nowTick;
    if (openAt === null || closeAt === null)
      return { label: 'Menunggu…', tone: 'muted', labelName };
    if (isCheckoutMode) {
      if (now < closeAt)
        return {
          label: `Dibuka s/d ${format(new Date(closeAt), 'HH:mm', { locale: idLocale })} WIB`,
          tone: 'green',
          labelName,
        };
      return { label: 'Berakhir', tone: 'red', labelName };
    }
    if (now < openAt) return { label: 'Belum Dibuka', tone: 'amber', labelName };
    if (now >= openAt && now < closeAt) {
      const minutesLeft = Math.max(
        1,
        Math.ceil(differenceInMinutes(new Date(closeAt), new Date(now)))
      );
      return { label: `Berjalan (sisa ${minutesLeft} menit)`, tone: 'green', labelName };
    }
    return { label: 'Ditutup', tone: 'red', labelName };
  };

  const ipStatusLabel = () => {
    if (!hasIpRestriction) return 'Tidak diwajibkan';
    if (!ipAddress) return 'Memuat…';
    return 'Dicek server saat kirim';
  };

  const actionOverlayLabel = loading
    ? 'Mengirim data absensi…'
    : checkoutSubmitting
      ? 'Memproses check-out…'
      : sessionLoading
        ? 'Memuat data sesi…'
        : checkoutLoading
          ? 'Memuat data check-out…'
          : null;

  // [UX] A-03 — halaman error penuh saat sesi gagal dimuat
  if (sessionLoadError && (sessionParam || isCheckoutMode)) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-4 size-12 text-red-500" aria-hidden="true" />
        <h1 className="text-xl font-bold text-foreground">Gagal memuat sesi</h1>
        <p className="mt-2 text-sm text-muted-foreground" role="alert">
          {sessionLoadError}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" className="min-h-11" onClick={() => void reloadSession()}>
            Muat ulang
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => navigate('/dashboard')}
          >
            Kembali ke dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isCheckoutMode) {
    return (
      <>
        <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
        <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Check-out Kehadiran</h1>
            <p className="text-muted-foreground">
              Konfirmasi untuk menyelesaikan kehadiran di sesi ini.
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card">
            {isOffline && (
              <div
                className="flex items-center justify-center gap-2 bg-amber-100 p-3 text-center text-sm font-medium text-amber-900"
                role="status"
              >
                <WifiOff size={16} aria-hidden="true" />
                {OFFLINE_USER_MESSAGE}
              </div>
            )}

            {checkoutLoading || sessionLoading ? (
              <div
                className="flex flex-1 flex-col items-center justify-center gap-3 p-10"
                aria-busy="true"
              >
                <div className="size-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                <p className="text-sm text-muted-foreground">Memuat data…</p>
              </div>
            ) : !myAttendance ? (
              <div className="p-6" role="alert">
                <p className="font-semibold text-red-800 dark:text-red-300">
                  {checkoutError || 'Data check-in tidak ditemukan.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-11 w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Kembali ke dashboard
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
                <div className="space-y-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kelas / Sesi
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {sessionDetails?.title || myAttendance.session_title}
                  </p>
                  <p className="text-base font-medium text-brand">
                    Check-in:{' '}
                    {format(new Date(myAttendance.check_in_time), 'dd MMM yyyy · HH:mm', {
                      locale: idLocale,
                    })}{' '}
                    WIB
                  </p>
                </div>
                {!scanResult ? (
                  qrValidating ? (
                    <p role="status" className="text-center">
                      Memeriksa QR sesi...
                    </p>
                  ) : (
                    <Suspense fallback={<p role="status">Menyiapkan pemindai QR...</p>}>
                      <AttendQrScanner
                        scanning={scanning}
                        setScanning={setScanning}
                        externalResult={scanResult}
                        resetNonce={qrResetNonce}
                        qrErrorOverride={qrError}
                        onQrErrorChange={setQrError}
                        onScanSuccess={handleQrScanSuccess}
                      />
                    </Suspense>
                  )
                ) : (
                  <>
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl bg-muted">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Pratinjau foto check-out"
                          className="size-full object-cover"
                        />
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            aria-hidden="true"
                            className={`size-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                          />
                          {isCameraActive &&
                          photoWatchdogStatus !== 'healthy' &&
                          photoWatchdogStatus !== 'paused' ? (
                            <div
                              role="status"
                              aria-live="polite"
                              className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-semibold text-white shadow-lg ring-1 ring-amber-200 backdrop-blur dark:ring-amber-800"
                            >
                              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                              <span>
                                {photoWatchdogStatus === 'degraded'
                                  ? 'Sinyal kamera menurun…'
                                  : photoWatchdogStatus === 'reconnecting'
                                    ? 'Memulihkan kamera…'
                                    : photoWatchdogStatus === 'failed'
                                      ? 'Kamera terputus'
                                      : 'Memantau kamera…'}
                              </span>
                            </div>
                          ) : null}
                        </>
                      )}
                      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col gap-3">
                      {!photoPreview && !isCameraActive ? (
                        <Button
                          type="button"
                          className="w-full"
                          disabled={cameraStarting}
                          onClick={() => void startCamera()}
                        >
                          {cameraStarting ? 'Menyiapkan kamera…' : 'Buka Kamera'}
                        </Button>
                      ) : null}
                      {!photoPreview && isCameraActive ? (
                        <Button
                          type="button"
                          className="w-full"
                          disabled={photoProcessing}
                          aria-busy={photoProcessing}
                          onClick={() => void takePhoto()}
                        >
                          {photoProcessing ? 'Mengompres foto...' : 'Ambil Foto Check-out'}
                        </Button>
                      ) : null}
                      {photoPreview ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={retakePhoto}
                        >
                          Ambil Ulang Foto
                        </Button>
                      ) : null}
                      <SubmitButton
                        type="button"
                        size="lg"
                        className="w-full py-6 text-lg font-bold"
                        onClick={() => void handleCheckOut()}
                        disabled={
                          isOffline || !scanResult || !photoBlob || !location || !isLocationValid()
                        }
                        isLoading={checkoutSubmitting}
                        label="Kirim Check-out"
                        loadingLabel="Memproses…"
                        icon={<LogOut size={20} aria-hidden="true" />}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full"
                        disabled={checkoutSubmitting}
                        onClick={() => navigate('/dashboard')}
                      >
                        Batal
                      </Button>
                    </div>
                  </>
                )}
                {checkoutError ? (
                  <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
                    {checkoutError}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Check-in Kehadiran</h1>
          <p className="text-sm text-muted-foreground">
            Scan QR Code kelas dan pastikan Anda berada di lokasi.
          </p>
        </div>

        <AttendPrivacyBanner />

        <AttendStepIndicator currentStep={!scanResult ? 1 : photoBlob ? 3 : 2} />

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card">
          {isOffline && (
            <div
              className="flex items-center justify-center gap-2 bg-amber-100 p-3 text-center text-sm font-medium text-amber-900"
              role="status"
            >
              <WifiOff size={16} aria-hidden="true" />
              {OFFLINE_USER_MESSAGE}
            </div>
          )}

          {submitError && (
            <div
              className={
                submitError.transient
                  ? 'mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40'
                  : 'mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/40'
              }
              role="alert"
              aria-live="assertive"
            >
              <div className="flex gap-3">
                <AlertCircle
                  className={
                    submitError.transient
                      ? 'mt-0.5 size-5 shrink-0 text-amber-600'
                      : 'mt-0.5 size-5 shrink-0 text-red-600'
                  }
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={
                        submitError.transient
                          ? 'font-semibold text-amber-800 dark:text-amber-300'
                          : 'font-semibold text-red-800 dark:text-red-300'
                      }
                    >
                      {submitError.message}
                    </p>
                    <span
                      className={
                        submitError.transient
                          ? 'inline-flex h-5 items-center rounded-full border border-amber-300 bg-amber-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          : 'inline-flex h-5 items-center rounded-full border border-red-300 bg-red-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-red-800 dark:border-red-800 dark:bg-red-900/60 dark:text-red-200'
                      }
                    >
                      {submitError.transient ? 'Sementara' : 'Tetap'}
                    </span>
                  </div>
                  {submitError.hint ? (
                    <p
                      className={
                        submitError.transient
                          ? 'mt-1 text-sm text-amber-700 dark:text-amber-400'
                          : 'mt-1 text-sm text-red-700 dark:text-red-400'
                      }
                    >
                      {submitError.hint}
                    </p>
                  ) : null}
                  <RateAwareRetryButton
                    loading={loading}
                    onClick={() => {
                      setSubmitError(null);
                      void handleCheckIn();
                    }}
                    transient={submitError.transient ?? false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          <div
            role="group"
            aria-label="Status persyaratan absensi"
            className="grid grid-cols-1 divide-y divide-border border-b border-border bg-muted/40 sm:grid-cols-2 md:grid-cols-4 sm:divide-y-0 md:divide-x"
          >
            <div className="flex flex-col items-center gap-2 p-5 text-center">
              <MapPin
                className={
                  !location
                    ? 'text-amber-600 animate-pulse dark:text-amber-400'
                    : isLocationValid()
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                }
                size={24}
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-muted-foreground">GPS Lokasi</span>
              <span className="text-xs font-semibold text-foreground">
                {!location
                  ? gpsError
                    ? 'Error'
                    : 'Mencari…'
                  : isLocationValid()
                    ? 'Akurat'
                    : 'Di Luar Radius'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 p-5 text-center">
              <ShieldAlert
                className={
                  !ipAddress
                    ? 'text-muted-foreground'
                    : isIpValid()
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                }
                size={24}
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-muted-foreground">IP Validasi</span>
              <span className="text-xs font-semibold text-foreground">{ipStatusLabel()}</span>
            </div>
            {(() => {
              const windowStatus = getAbsensiWindowStatus();
              const toneClass =
                windowStatus.tone === 'green'
                  ? 'text-green-600 dark:text-green-400'
                  : windowStatus.tone === 'amber'
                    ? 'text-amber-600 animate-pulse dark:text-amber-400'
                    : windowStatus.tone === 'red'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground';
              return (
                <div className="flex flex-col items-center gap-2 p-5 text-center">
                  <Clock className={toneClass} size={24} aria-hidden="true" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {windowStatus.labelName}
                  </span>
                  <span className="text-xs font-semibold text-foreground" aria-live="polite">
                    {windowStatus.label}
                  </span>
                </div>
              );
            })()}
            <div className="flex flex-col items-center gap-2 p-5 text-center">
              <Camera
                className={
                  photoBlob
                    ? 'text-green-600 dark:text-green-400'
                    : cameraStarting
                      ? 'text-brand animate-pulse'
                      : 'text-amber-600 dark:text-amber-400'
                }
                size={24}
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-muted-foreground">Foto Bukti</span>
              <span className="text-xs font-semibold text-foreground">
                {photoBlob ? 'Tersimpan' : cameraStarting ? 'Menyiapkan…' : 'Menunggu'}
              </span>
            </div>
          </div>

          {(cameraPermissionError || gpsError) && (
            <div
              className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40 sm:mx-6"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-red-800 dark:text-red-300">
                    Perlu perbaikan sebelum absen
                  </p>
                  {gpsError ? (
                    <p className="text-sm text-red-700 dark:text-red-400">GPS: {gpsError}</p>
                  ) : null}
                  {cameraPermissionError ? (
                    <p className="text-sm text-red-700 dark:text-red-400">
                      Kamera: {cameraPermissionError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-8 p-5 sm:p-8">
            {location && sessionDetails?.location && (
              <Suspense
                fallback={<div className="h-52 w-full animate-pulse rounded-xl bg-muted" />}
              >
                <AttendLocationMap
                  location={location}
                  sessionLocation={sessionDetails.location}
                  isLocationValid={isLocationValid()}
                />
              </Suspense>
            )}

            <div className="flex flex-1 flex-col items-center justify-center">
              {qrValidating ? (
                <div className="flex min-h-64 items-center gap-3" role="status">
                  <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                  Memeriksa QR sesi...
                </div>
              ) : scanning || !scanResult ? (
                <Suspense
                  fallback={
                    <div className="flex w-full max-w-md flex-col items-center gap-4">
                      <div className="min-h-[300px] w-full animate-pulse rounded-2xl bg-slate-900" />
                      <p className="text-sm text-muted-foreground">Menyiapkan pemindai QR…</p>
                    </div>
                  }
                >
                  <AttendQrScanner
                    scanning={scanning}
                    setScanning={setScanning}
                    externalResult={scanResult}
                    resetNonce={qrResetNonce}
                    qrErrorOverride={qrError}
                    onQrErrorChange={setQrError}
                    onScanSuccess={handleQrScanSuccess}
                    sessionLoading={sessionLoading}
                  />
                </Suspense>
              ) : !photoBlob ? (
                <div className="flex w-full max-w-md animate-in flex-col items-center gap-6 duration-300 zoom-in">
                  <h2 className="text-center text-xl font-bold text-foreground">
                    Ambil Foto Bukti Kehadiran
                  </h2>

                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-black shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      aria-hidden="true"
                      className={`w-full h-full object-cover absolute inset-0 z-10 ${isCameraActive ? 'block' : 'hidden'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''} pointer-events-none`}
                    ></video>

                    {isCameraActive &&
                    photoWatchdogStatus !== 'healthy' &&
                    photoWatchdogStatus !== 'paused' ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className="absolute left-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-semibold text-white shadow-lg ring-1 ring-amber-200 backdrop-blur dark:ring-amber-800"
                      >
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        <span>
                          {photoWatchdogStatus === 'degraded'
                            ? 'Sinyal kamera menurun…'
                            : photoWatchdogStatus === 'reconnecting'
                              ? 'Memulihkan kamera…'
                              : photoWatchdogStatus === 'failed'
                                ? 'Kamera terputus'
                                : 'Memantau kamera…'}
                        </span>
                      </div>
                    ) : null}

                    {!isCameraActive && (
                      <div className="relative z-20 flex flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                        {cameraStarting ? (
                          <Loader2
                            className="size-10 animate-spin text-indigo-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Camera size={48} className="opacity-50" aria-hidden="true" />
                        )}
                        <p className="max-w-xs text-sm leading-relaxed">
                          {cameraStarting
                            ? 'Menyiapkan kamera… Izinkan akses jika diminta browser.'
                            : cameraPermissionError
                              ? cameraPermissionError
                              : 'Ketuk tombol di bawah untuk membuka kamera.'}
                        </p>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>
                  </div>

                  <div className="relative z-10 flex w-full flex-col justify-center gap-3 sm:flex-row">
                    {!isCameraActive ? (
                      <Button
                        type="button"
                        className="min-h-11 w-full gap-2 sm:w-auto"
                        disabled={cameraStarting}
                        onClick={() => void startCamera()}
                      >
                        {cameraStarting ? (
                          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Camera size={20} aria-hidden="true" />
                        )}
                        {cameraStarting ? 'Menyiapkan…' : 'Buka Kamera'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 w-full gap-2 sm:w-auto"
                          disabled={photoProcessing}
                          onClick={() => switchCamera()}
                        >
                          <RefreshCw size={20} aria-hidden="true" />
                          Kamera {facingMode === 'user' ? 'Depan' : 'Belakang'}
                        </Button>
                        <Button
                          type="button"
                          className="min-h-11 w-full gap-2 bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                          disabled={photoProcessing}
                          aria-busy={photoProcessing}
                          onClick={() => void takePhoto()}
                        >
                          {photoProcessing ? (
                            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Camera size={20} aria-hidden="true" />
                          )}
                          {photoProcessing ? 'Mengompres foto...' : 'Ambil Foto'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex w-full max-w-md animate-in flex-col items-center gap-6 duration-300 zoom-in">
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-md">
                    <img
                      src={photoPreview!}
                      alt="Pratinjau foto check-in Anda"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 px-2 text-center">
                    <h2 className="text-xl font-bold text-foreground">Data Siap Dikirim</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Sistem telah mendapatkan token QR, lokasi GPS, foto bukti, dan informasi
                      perangkat Anda.
                    </p>
                  </div>

                  <div className="w-full space-y-4">
                    <SubmitButton
                      size="lg"
                      onClick={handleCheckIn}
                      disabled={!location || !!gpsError || isOffline || !scanResult}
                      isLoading={loading}
                      label="Kirim Data Absensi"
                      loadingLabel="Mengirim absensi…"
                      className="w-full py-6 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={retakePhoto}
                        disabled={loading}
                        className="w-full font-bold"
                      >
                        <Camera size={18} className="mr-2" /> Ulang Foto
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          stopCamera();
                          setPhotoBlob(null);
                          setPhotoPreview(null);
                          setScanResult(null);
                          setQrError(null);
                          setScanning(true);
                          setQrResetNonce((n) => n + 1);
                        }}
                        disabled={loading}
                        className="w-full font-bold"
                      >
                        <QrCode size={18} className="mr-2" /> Ulang QR
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
