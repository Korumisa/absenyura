import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '@/services/api';
import { toast } from 'sonner';
import { MapPin, QrCode, ShieldAlert, Camera, RefreshCw, WifiOff, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Report } from '@/types/report';
import { APP_ONLINE_EVENT, OFFLINE_USER_MESSAGE, ONLINE_USER_MESSAGE } from '@/lib/networkEvents';
import { getErrorMessage } from '@/lib/errorMessage';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { saveOfflineAttendance } from '@/lib/idb';
import {
  acquireCameraStream,
  humanizeCameraError,
  pickPreferredCameraId,
  releaseMediaStream,
  waitForCameraRelease,
} from '@/lib/camera';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';

import { Button } from '@/components/ui/button';

import { fixLeafletDefaultIcons } from '@/lib/leafletIcon';

fixLeafletDefaultIcons();

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

const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center);
    }, [center, map]);
    return null;
  };

export default function Attend() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionParam = searchParams.get('session');
  const tokenParam = searchParams.get('token');
  const isCheckoutMode = searchParams.get('checkout') === 'true'; // [UX] A-01, D-02
  const attendanceParam = searchParams.get('attendance');
  const NO_QR_TOKEN = 'NO_QR_REQUIRED';

  const [scanResult, setScanResult] = useState<string | null>(tokenParam);
  const [scanning, setScanning] = useState(!tokenParam);
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
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = React.useRef<Html5QrcodeScanner | null>(null);
  const isSubmittingRef = React.useRef(false);
  const [qrFacingMode, setQrFacingMode] = useState<'user' | 'environment'>('environment');
  const [qrCameraId, setQrCameraId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<{ message: string; hint?: string } | null>(null);

  const loadQrCamera = useCallback(async (preferRear: boolean) => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      const preferredId = pickPreferredCameraId(
        cameras.map((c) => ({ id: c.id, label: c.label })),
        { preferRear }
      );
      setQrCameraId(preferredId);
    } catch {
      setQrCameraId(null);
    }
  }, []);

  useEffect(() => {
    loadQrCamera(true);
  }, [loadQrCamera]);

  // Derived session ID from parameter or scan result
  const extractSessionIdAndToken = (rawResult: string | null) => {
    if (!rawResult) return { sid: sessionParam, tkn: tokenParam };
    
    try {
      // 1. Check if it's a URL
      if (rawResult.includes('http') || rawResult.includes('?session=')) {
        const urlObj = new URL(rawResult.startsWith('http') ? rawResult : `http://localhost${rawResult}`);
        const sid = urlObj.searchParams.get('session');
        const tkn = urlObj.searchParams.get('token');
        return { sid: sid || sessionParam, tkn: tkn || rawResult };
      }
    } catch (e) {
      // Not a valid URL, fallback
    }

    // 2. Check if it's a dynamic token string (sessionId:timestamp:signature)
    if (rawResult.includes(':') && rawResult.split(':').length === 3) {
      return { sid: rawResult.split(':')[0].trim(), tkn: rawResult.trim() };
    }

    // 3. Fallback: Assume it's a raw static token
    return { sid: sessionParam, tkn: rawResult.trim() };
  };

  const { sid: derivedSessionId, tkn: parsedToken } = extractSessionIdAndToken(scanResult);

  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(sessionParam && !tokenParam));
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null); // [UX] A-03
  const [myAttendance, setMyAttendance] = useState<Pick<Report, 'id' | 'check_in_time' | 'session_title'> | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(isCheckoutMode);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const sessionIdForLoad = isCheckoutMode ? sessionParam : derivedSessionId;

  const reloadSession = useCallback(async () => {
    if (!sessionIdForLoad || sessionIdForLoad === NO_QR_TOKEN) {
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
      if (!isCheckoutMode && s.qr_mode === 'NONE') {
        setScanning(false);
        setScanResult(NO_QR_TOKEN);
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memuat data sesi absensi.');
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
      setCheckoutError(getErrorMessage(err, 'Gagal memuat data kehadiran Anda.'));
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
      toast.success(ONLINE_USER_MESSAGE, { id: 'attend-online' });
      void reloadSession();
      if (isCheckoutMode) void reloadCheckout();
    };
    window.addEventListener(APP_ONLINE_EVENT, resumeAfterOnline);
    return () => window.removeEventListener(APP_ONLINE_EVENT, resumeAfterOnline);
  }, [reloadSession, reloadCheckout, isCheckoutMode]);

  const handleCheckOut = async () => {
    if (!myAttendance?.id || checkoutSubmitting) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await api.put(`/attendance/${myAttendance.id}/check-out`);
      toast.success(res.data?.message || 'Check-out berhasil!');
      navigate('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err, 'Check-out gagal. Coba lagi.');
      setCheckoutError(msg);
      toast.error(msg);
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(err => console.error('Gagal mengambil IP', err));
  }, []);

  const isSpoofedLocation = (pos: GeolocationPosition) => {
    // Basic heuristics for web-based fake GPS
    // 1. Extremely low accuracy that is highly unusual for real devices
    if (pos.coords.accuracy !== null && pos.coords.accuracy < 2) {
      return true;
    }
    // 2. Suspiciously round coordinates often seen in emulators
    if (
      pos.coords.latitude % 1 === 0 &&
      pos.coords.longitude % 1 === 0
    ) {
      return true;
    }
    return false;
  };

  const handlePosition = (pos: GeolocationPosition) => {
    if (isSpoofedLocation(pos)) {
      setGpsError('Terdeteksi aplikasi Fake GPS atau anomali lokasi.');
      toast.error('Lokasi ditolak: Terdeteksi aplikasi Fake GPS.');
      setLocation(null);
      return;
    }
    
    const acc = pos.coords.accuracy;
    setGpsAccuracy(acc);

    if (acc > 150) {
      setGpsError(`Akurasi lokasi terlalu rendah (${Math.round(acc)}m). Silakan ke area terbuka.`);
      toast.warning('Akurasi lokasi rendah. Cari tempat terbuka.');
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      return;
    }
    
    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setGpsError(null);
  };

  const requestLocationOnce = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung Geolocation');
      toast.error('Browser Anda tidak mendukung Geolocation.');
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
        toast.error('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const isIpValid = () => {
    if (!ipAddress) return false;
    if (!sessionDetails?.location?.wifi_bssid) return true; // No restriction
    try {
      const allowedIPs = JSON.parse(sessionDetails.location.wifi_bssid);
      if (Array.isArray(allowedIPs) && allowedIPs.length > 0) {
        return allowedIPs.includes(ipAddress);
      }
    } catch (e) {
      // Ignore
    }
    return true; // If parsing fails or empty, default to true
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
  }, []);

  const releaseQrScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {
        void 0;
      }
      scannerRef.current = null;
    }
    await waitForCameraRelease();
  }, []);

  useEffect(() => {
    if (scanning && !scanResult && !scannerRef.current) {
      const videoConstraints = qrCameraId
        ? { deviceId: { ideal: qrCameraId } }
        : { facingMode: { ideal: qrFacingMode } };

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          videoConstraints,
        },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        async (decodedText) => {
          await releaseQrScanner();
          setScanResult(decodedText);
          setScanning(false);
        },
        () => {
          // Abaikan kegagalan scan berulang sampai QR terbaca
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => undefined);
        scannerRef.current = null;
      }
    };
  }, [scanning, scanResult, qrCameraId, qrFacingMode, releaseQrScanner]);

  const switchQrCamera = async () => {
    const nextMode = qrFacingMode === 'environment' ? 'user' : 'environment';
    setQrFacingMode(nextMode);
    await loadQrCamera(nextMode === 'environment');

    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {
        void 0;
      }
      scannerRef.current = null;
    }
    setScanResult(null);
    setScanning(true);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      releaseMediaStream(videoRef.current.srcObject as MediaStream);
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Add cleanup effect for camera to prevent memory/hardware leak when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = useCallback(
    async (mode = facingMode) => {
      setCameraStarting(true);
      setCameraPermissionError(null);
      try {
        stopCamera();
        if (scannerRef.current) {
          await releaseQrScanner();
        } else {
          await waitForCameraRelease(400);
        }

        let lastErr: unknown;
        for (let attempt = 0; attempt < 4; attempt++) {
          if (attempt > 0) {
            await waitForCameraRelease(700 + attempt * 350);
          }
          try {
            const stream = await acquireCameraStream({
              facingMode: mode,
              preferRear: mode === 'environment',
            });
            setIsCameraActive(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play().catch(() => undefined);
            }
            return;
          } catch (err) {
            lastErr = err;
          }
        }

        const msg = humanizeCameraError(lastErr);
        setCameraPermissionError(msg);
        toast.error(msg);
      } finally {
        setCameraStarting(false);
      }
    },
    [facingMode, releaseQrScanner]
  );

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isCameraActive) {
      startCamera(newMode);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Calculate scaled dimensions to prevent massive payloads
      const MAX_WIDTH = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Balik canvas secara horizontal jika menggunakan kamera depan agar hasil foto tidak mirror (sama dengan yang dilihat user)
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Kembalikan transformasi sebelum menulis teks agar teks tidak terbalik
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        // Add watermark
        ctx.font = '14px Arial';
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(`${new Date().toLocaleString()}`, 10, canvas.height - 30);
        if (location) {
          ctx.fillText(`Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`, 10, canvas.height - 10);
        }
        ctx.shadowBlur = 0; // reset

        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
            setPhotoPreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.7); // Compress to 70% quality
      }
    }
  };

  const retakePhoto = () => {
    setPhotoBlob(null);
    setPhotoPreview(null);
    startCamera();
  };

  const handleCheckIn = async () => {
    if (isSubmittingRef.current) return;
    if (gpsError) {
      toast.error(`GPS bermasalah: ${gpsError}`);
      return;
    }
    if (!scanResult) {
      toast.error('Silakan scan QR Code terlebih dahulu.');
      return;
    }
    if (!location) {
      toast.error('Menunggu lokasi GPS...');
      return;
    }
    // We require photo evidence for this iteration as requested
    if (!photoBlob) {
      toast.error('Silakan ambil foto bukti terlebih dahulu.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setSubmitError(null); // [UX] bersihkan error sebelum percobaan baru
    try {
      let sessionId = derivedSessionId;
      const qrToken = parsedToken;

      if (!sessionId) {
        throw new Error('Sesi tidak ditemukan dalam QR Code atau URL.');
      }
      
      // Bersihkan whitespace jika ada (misal dari hasil scan)
      sessionId = sessionId.trim();

      const deviceFingerprint = localStorage.getItem('device_fingerprint') || 'unknown-device';

      if (isOffline) {
        // Save to IndexedDB
        await saveOfflineAttendance({
          session_id: sessionId,
          token: qrToken !== NO_QR_TOKEN ? qrToken : undefined,
          lat: location.lat,
          lng: location.lng,
          deviceInfo: deviceFingerprint
        });
        toast.success('Tersimpan offline. Akan terkirim otomatis saat internet kembali.');
        navigate('/dashboard');
        return;
      }

      // --- ANTI-CHEAT LAYER 2: Request Nonce ---
      const challengeRes = await api.get('/attendance/challenge');
      const nonce = challengeRes.data?.data?.nonce;
      if (!nonce) {
        throw new Error('Gagal mendapatkan security token dari server');
      }

      // Generate signature (HMAC-like)
      const secret = import.meta.env.VITE_APP_SECRET || 'absenyura-secure-2026';
      const payloadToSign = `${nonce}:${location.lat}:${location.lng}:${secret}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(payloadToSign);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const signature = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const formData = new FormData();
      formData.append('session_id', sessionId);
      if (qrToken !== NO_QR_TOKEN) {
        formData.append('qr_token', qrToken);
      }
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('accuracy', (gpsAccuracy || 0).toString());
      formData.append('ip_address', ipAddress);
      formData.append('device_fingerprint', deviceFingerprint);
      formData.append('nonce', nonce);
      formData.append('signature', signature);
      
      if (photoBlob) {
        formData.append('photo', photoBlob, 'attendance.jpg');
      }

      const res = await api.post('/attendance/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(res.data.message || 'Check-in berhasil!');
      navigate('/dashboard');
    } catch (error: unknown) {
      const apiMsg = getErrorMessage(error, 'Absensi gagal dikirim');
      const lower = apiMsg.toLowerCase();
      const isQrError = lower.includes('qr') || lower.includes('token') || lower.includes('kadaluarsa');
      // [UX] #1 — jangan reset seluruh alur; pertahankan QR & foto kecuali error QR
      if (isQrError) {
        setScanResult(null);
        setScanning(true);
        setPhotoBlob(null);
        setPhotoPreview(null);
        setSubmitError({
          message: apiMsg,
          hint: 'Scan ulang QR Code dari layar dosen, lalu lanjutkan langkah berikutnya.',
        });
      } else {
        setSubmitError({
          message: apiMsg,
          hint: 'Periksa koneksi internet atau lokasi GPS, lalu tekan "Coba kirim lagi" tanpa mengulang dari awal.',
        });
      }
      toast.error(apiMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const isLocationValid = () => {
    if (!location || !sessionDetails?.location) return false;
    const dist = getDistanceMeters(location, { 
      lat: sessionDetails.location.latitude, 
      lng: sessionDetails.location.longitude 
    });
    return dist <= sessionDetails.location.radius;
  };

  const ipStatusLabel = () => {
    if (!ipAddress) return 'Memuat…';
    if (!sessionDetails?.location?.wifi_bssid) return 'Tidak diwajibkan';
    return isIpValid() ? 'Terverifikasi' : 'Di luar jaringan kampus';
  };

  const checkInReady =
    !!scanResult &&
    !!location &&
    !gpsError &&
    !!photoBlob &&
    !isOffline &&
    (sessionDetails?.location ? isLocationValid() : true);

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
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gagal memuat sesi</h1>
        <p className="mt-2 text-sm text-muted-foreground text-muted-foreground" role="alert">
          {sessionLoadError}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              setSessionLoadError(null);
              setSessionLoading(true);
              const sid = sessionIdForLoad;
              if (!sid) return;
              api
                .get(`/sessions/${sid}`)
                .then((res) => {
                  setSessionDetails(res.data.data);
                  setSessionLoadError(null);
                })
                .catch((err) => setSessionLoadError(getErrorMessage(err, 'Gagal memuat data sesi absensi.')))
                .finally(() => setSessionLoading(false));
            }}
          >
            Muat ulang
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate('/dashboard')}>
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Check-out Kehadiran</h1>
          <p className="text-muted-foreground text-muted-foreground">Konfirmasi untuk menyelesaikan kehadiran di sesi ini.</p>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm border-border bg-muted">
          {isOffline && (
            <div className="flex items-center justify-center gap-2 bg-amber-100 p-3 text-center text-sm font-medium text-amber-900" role="status">
              <WifiOff size={16} aria-hidden="true" />
              {OFFLINE_USER_MESSAGE}
            </div>
          )}

          {checkoutLoading || sessionLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10" aria-busy="true">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <p className="text-sm text-muted-foreground">Memuat data…</p>
            </div>
          ) : checkoutError || !myAttendance ? (
            <div className="p-6" role="alert">
              <p className="font-semibold text-red-800 dark:text-red-300">
                {checkoutError || 'Data check-in tidak ditemukan.'}
              </p>
              <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={() => navigate('/dashboard')}>
                Kembali ke dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-6 p-6 sm:p-8">
              <div className="w-full space-y-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelas / Sesi</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {sessionDetails?.title || myAttendance.session_title}
                </p>
                <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu check-in</p>
                <p className="text-base font-medium text-brand text-brand">
                  {format(new Date(myAttendance.check_in_time), 'dd MMM yyyy · HH:mm', { locale: idLocale })} WIB
                </p>
              </div>
              <div className="w-full space-y-3 pt-2">
              <Button
                type="button"
                size="lg"
                className="w-full py-6 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                onClick={() => void handleCheckOut()}
                disabled={checkoutSubmitting || isOffline}
                aria-busy={checkoutSubmitting}
              >
                {checkoutSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut size={20} className="mr-2" aria-hidden="true" />
                )}
                {checkoutSubmitting ? 'Memproses…' : 'Kirim Check-out'}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 w-full" disabled={checkoutSubmitting} onClick={() => navigate('/dashboard')}>
                Batal
              </Button>
              </div>
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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Check-in Kehadiran</h1>
        <p className="text-muted-foreground text-muted-foreground">Scan QR Code kelas dan pastikan Anda berada di lokasi.</p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm border-border bg-muted">
        {isOffline && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 p-3 text-center text-sm font-medium text-amber-900" role="status">
            <WifiOff size={16} aria-hidden="true" />
            {OFFLINE_USER_MESSAGE}
          </div>
        )}

        {submitError && (
          <div
            className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/40"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-red-800 dark:text-red-300">{submitError.message}</p>
                {submitError.hint ? <p className="mt-1 text-sm text-red-700 dark:text-red-400">{submitError.hint}</p> : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 min-h-11 border-red-300"
                  onClick={() => {
                    setSubmitError(null);
                    void handleCheckIn();
                  }}
                  disabled={loading}
                >
                  Coba kirim lagi
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-2 divide-x divide-y border-b border-border bg-slate-50 dark:divide-zinc-700 border-border bg-background md:grid-cols-4 md:divide-y-0">
          <div className="flex flex-col items-center gap-2 p-5 text-center">
            <QrCode className={scanResult ? 'text-green-500' : 'text-slate-400'} size={24} />
            <span className="text-xs font-medium text-muted-foreground text-muted-foreground">QR Code</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {sessionDetails?.qr_mode === 'NONE' ? 'Tidak Perlu' : scanResult ? 'Terscan' : 'Menunggu'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-5 text-center">
            <MapPin className={!location ? 'text-amber-500 animate-pulse' : isLocationValid() ? 'text-green-500' : 'text-red-500'} size={24} />
            <span className="text-xs font-medium text-muted-foreground text-muted-foreground">GPS Lokasi</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {!location ? (gpsError ? 'Error' : 'Mencari…') : isLocationValid() ? 'Akurat' : 'Di Luar Radius'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-5 text-center">
            <ShieldAlert className={!ipAddress ? 'text-slate-400' : isIpValid() ? 'text-green-500' : 'text-red-500'} size={24} />
            <span className="text-xs font-medium text-muted-foreground text-muted-foreground">IP Validasi</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {ipStatusLabel()}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-5 text-center">
            <Camera className={photoBlob ? 'text-green-500' : cameraStarting ? 'text-indigo-500 animate-pulse' : 'text-amber-500'} size={24} />
            <span className="text-xs font-medium text-muted-foreground text-muted-foreground">Foto Bukti</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
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
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-red-800 dark:text-red-300">Perlu perbaikan sebelum absen</p>
                {gpsError ? <p className="text-sm text-red-700 dark:text-red-400">GPS: {gpsError}</p> : null}
                {cameraPermissionError ? (
                  <p className="text-sm text-red-700 dark:text-red-400">Kamera: {cameraPermissionError}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {!scanning && scanResult && (
          <div
            className="mx-4 mt-4 rounded-xl border border-border bg-slate-50 p-4 border-border bg-background/50 sm:mx-6"
            role="status"
            aria-live="polite"
          >
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">Status persiapan check-in</p>
            <ul className="space-y-2 text-sm">
              <li className={scanResult ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700'}>
                {scanResult ? '✓' : '○'} QR / token sesi
              </li>
              <li className={location && !gpsError ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700'}>
                {location && !gpsError ? '✓' : '○'} Lokasi GPS
              </li>
              <li className={photoBlob ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700'}>
                {photoBlob ? '✓' : '○'} Foto bukti
                {!photoBlob && !cameraStarting ? ' — ketuk Buka Kamera' : ''}
                {cameraStarting ? ' — menyiapkan kamera…' : ''}
              </li>
              <li className={checkInReady ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-muted-foreground text-muted-foreground'}>
                {checkInReady ? '✓ Siap dikirim' : '○ Belum siap dikirim'}
              </li>
            </ul>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-8 p-5 sm:p-8">
          {location && sessionDetails?.location && (
            <div className="z-0 h-52 w-full overflow-hidden rounded-xl border border-border shadow-inner border-border">
              <MapContainer 
                center={[location.lat, location.lng]} 
                zoom={16} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={[location.lat, location.lng]} />
                
                <Marker position={[location.lat, location.lng]}>
                  <Popup>Lokasi Anda Saat Ini</Popup>
                </Marker>

                {sessionDetails?.location && (
                  <Circle 
                    center={[sessionDetails.location.latitude, sessionDetails.location.longitude]} 
                    radius={sessionDetails.location.radius} 
                    pathOptions={{ color: isLocationValid() ? 'green' : 'red', fillColor: isLocationValid() ? 'green' : 'red', fillOpacity: 0.2 }}
                  >
                    <Popup>Area Absensi ({sessionDetails.location.radius}m)</Popup>
                  </Circle>
                )}
              </MapContainer>
            </div>
          )}

          <div className="flex flex-1 flex-col items-center justify-center">
            {scanning ? (
              <div className="w-full max-w-md">
                <div className="relative overflow-hidden rounded-2xl border-4 border-border bg-slate-900 shadow-2xl border-border">
                  <div className="pointer-events-none absolute inset-0 z-10 m-8 rounded-xl border-[3px] border-dashed border-indigo-500/50" />
                  <div
                    id="qr-reader"
                    className="flex min-h-[300px] w-full flex-col bg-black [&>div]:border-none [&>div]:shadow-none [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
                  />
                </div>
                <div className="mt-8 space-y-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground text-muted-foreground">
                    Arahkan kamera ke QR Code yang ditampilkan oleh Dosen.
                  </p>
                  <div className="flex justify-center">
                    <Button type="button" variant="outline" onClick={switchQrCamera} className="gap-2">
                      <RefreshCw size={16} />
                      Kamera QR {qrFacingMode === 'environment' ? 'Belakang' : 'Depan'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : !photoBlob ? (
              <div className="flex w-full max-w-md animate-in flex-col items-center gap-6 duration-300 zoom-in">
                <h2 className="text-center text-xl font-bold text-slate-800 dark:text-white">Ambil Foto Bukti Kehadiran</h2>
                
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-black shadow-inner border-border">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover absolute inset-0 z-10 ${isCameraActive ? 'block' : 'hidden'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  ></video>
                  
                  {!isCameraActive && (
                    <div className="relative z-20 flex flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                      {cameraStarting ? (
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" aria-hidden="true" />
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
                  <canvas ref={canvasRef} className="hidden"></canvas>
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
                      <Button type="button" variant="secondary" className="min-h-11 w-full gap-2 sm:w-auto" onClick={() => switchCamera()}>
                        <RefreshCw size={20} aria-hidden="true" />
                        Kamera {facingMode === 'user' ? 'Depan' : 'Belakang'}
                      </Button>
                      <Button type="button" className="min-h-11 w-full gap-2 bg-emerald-600 hover:bg-emerald-700 sm:w-auto" onClick={() => takePhoto()}>
                        <Camera size={20} aria-hidden="true" />
                        Ambil Foto
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex w-full max-w-md animate-in flex-col items-center gap-6 duration-300 zoom-in">
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-md border-border">
                  <img 
                    src={photoPreview!} 
                    alt="Bukti Kehadiran" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                <div className="space-y-2 px-2 text-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Data Siap Dikirim</h2>
                <p className="text-sm leading-relaxed text-muted-foreground text-muted-foreground">
                  Sistem telah mendapatkan token QR, lokasi GPS, foto bukti, dan informasi perangkat Anda.
                </p>
                </div>
                
                <div className="w-full space-y-4">
                  <Button
                    size="lg"
                    onClick={handleCheckIn}
                    disabled={loading || !location || !!gpsError || isOffline}
                    className="w-full py-6 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                    aria-busy={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                        Mengirim absensi…
                      </>
                    ) : (
                      'Kirim Data Absensi'
                    )}
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="lg" onClick={retakePhoto} disabled={loading} className="w-full font-bold">
                      <Camera size={18} className="mr-2" /> Ulang Foto
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        stopCamera();
                        setPhotoBlob(null);
                        setPhotoPreview(null);
                        if (sessionDetails?.qr_mode === 'NONE') {
                          setScanResult(NO_QR_TOKEN);
                          setScanning(false);
                        } else {
                          setScanResult(null);
                          void releaseQrScanner().then(() => setScanning(true));
                        }
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
