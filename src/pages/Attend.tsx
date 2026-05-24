import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '@/services/api';
import { toast } from 'sonner';
import { MapPin, QrCode, ShieldAlert, Camera, RefreshCw, WifiOff, AlertCircle, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Report } from '@/types/report';
import { AttendWizardHeader, type AttendStep } from '@/components/attend/AttendWizardHeader';
import { AttendStepPanel } from '@/components/attend/AttendStepPanel';
import { getErrorMessage } from '@/lib/errorMessage';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { saveOfflineAttendance } from '@/lib/idb';
import { pickPreferredCameraId } from '@/lib/camera';

import { Button } from '@/components/ui/button';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
  const [attendStep, setAttendStep] = useState<AttendStep>(tokenParam ? 'verify' : 'scan');
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

  useEffect(() => {
    if (!sessionIdForLoad || sessionIdForLoad === NO_QR_TOKEN) {
      setSessionLoading(false);
      return;
    }

    if (isOffline && !isCheckoutMode) {
      toast.info('Mode Offline: Mengumpulkan data absen lokal');
      setSessionLoading(false);
      return;
    }

    setSessionLoading(true);
    setSessionLoadError(null);

    api
      .get(`/sessions/${sessionIdForLoad}`)
      .then((res) => {
        const s = res.data.data;
        setSessionDetails(s);
        if (!isCheckoutMode && s.qr_mode === 'NONE') {
          setScanning(false);
          setScanResult(NO_QR_TOKEN);
          setAttendStep('verify');
        }
      })
      .catch((err) => {
        const msg = getErrorMessage(err, 'Gagal memuat data sesi absensi.');
        setSessionLoadError(msg);
        setSessionDetails(null);
      })
      .finally(() => setSessionLoading(false));
  }, [sessionIdForLoad, isCheckoutMode, isOffline]);

  // [UX] A-01 — muat data check-in untuk mode checkout (tanpa QR/foto)
  useEffect(() => {
    if (!isCheckoutMode || !sessionParam) return;

    let cancelled = false;
    setCheckoutLoading(true);
    setCheckoutError(null);

    const load = async () => {
      try {
        const res = await api.get('/reports', { params: { sessionId: sessionParam, limit: 5 } });
        const rows: Report[] = res.data?.data ?? [];
        const match =
          rows.find((r) => r.id === attendanceParam) ??
          rows.find((r) => r.session_id === sessionParam) ??
          null;

        if (cancelled) return;

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
        if (!cancelled) {
          setCheckoutError(getErrorMessage(err, 'Gagal memuat data kehadiran Anda.'));
        }
      } finally {
        if (!cancelled) setCheckoutLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isCheckoutMode, sessionParam, attendanceParam]);

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
    navigator.geolocation.getCurrentPosition(
      handlePosition,
      (err) => {
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

  useEffect(() => {
    if (scanning && !scanResult && !scannerRef.current) {
      const videoConstraints = qrCameraId
        ? { deviceId: { exact: qrCameraId } }
        : { facingMode: { ideal: qrFacingMode } };

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          videoConstraints
        },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        async (decodedText) => {
          try {
            await scanner.clear();
          } catch (e) {
            void e;
          }
          scannerRef.current = null;
          setScanResult(decodedText);
          setScanning(false);
          setAttendStep('verify'); // [IA] lanjut ke verifikasi lokasi setelah QR valid
        },
        (err) => {
          // Ignore scan failures, they happen constantly until a code is found
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error('Gagal membersihkan scanner', e));
        scannerRef.current = null;
      }
    };
  }, [scanning, scanResult, qrCameraId, qrFacingMode]);

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
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
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

  const startCamera = async (mode = facingMode, retryCount = 0) => {
    try {
      setCameraPermissionError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraPermissionError('Browser Anda tidak mendukung akses kamera (HTTPS diperlukan).');
        toast.error('Browser Anda tidak mendukung akses kamera (HTTPS diperlukan).');
        return;
      }
      
      // Stop existing streams
      stopCamera();
      
      // Give mobile hardware a tiny bit of time to release locks if we are retrying or switching from QR
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let stream;
      try {
        // Try exact facing mode first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      } catch (e: any) {
        // Fallback to any available video camera
        try {
           stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch(fallbackErr: any) {
           console.error('Camera fallback error:', fallbackErr);
           
           // If we hit a hardware lock error, retry up to 2 times
           const isHardwareLock = ['NotReadableError', 'TrackStartError', 'OverconstrainedError'].includes(fallbackErr.name);
           if (retryCount < 2 && isHardwareLock) {
             console.warn(`Retrying camera connection (Attempt ${retryCount + 1})...`);
             return startCamera(mode, retryCount + 1);
           }
           
           // Handle specific errors
           if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'SecurityError') {
             setCameraPermissionError('Izin ditolak. Izinkan akses kamera di pengaturan browser.');
           } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
             setCameraPermissionError('Tidak ada kamera yang terdeteksi di perangkat ini.');
           } else {
             setCameraPermissionError(`Error Kamera: ${fallbackErr.message || fallbackErr.name}`);
           }
           return;
        }
      }
      
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error('Video play error:', playErr);
        }
      }
    } catch (err: any) {
      console.error('Start camera error:', err);
      setCameraPermissionError(`Gagal mengakses kamera: ${err.message || 'Unknown Error'}`);
    }
  };

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
        toast.success('Offline Mode: Data absensi disimpan lokal dan akan dikirim saat online.');
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
        setAttendStep('scan');
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

  const qrSkipped = sessionDetails?.qr_mode === 'NONE' || scanResult === NO_QR_TOKEN;

  const ipStatusLabel = () => {
    if (!ipAddress) return 'Memuat…';
    if (!sessionDetails?.location?.wifi_bssid) return 'Tidak diwajibkan';
    return isIpValid() ? 'Terverifikasi' : 'Di luar jaringan kampus';
  };

  // [UX] A-03 — halaman error penuh saat sesi gagal dimuat
  if (sessionLoadError && (sessionParam || isCheckoutMode)) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gagal memuat sesi</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400" role="alert">
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

  // [UX] A-01 — mode checkout: konfirmasi tanpa QR/foto
  if (isCheckoutMode) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col p-4 sm:p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Konfirmasi check-out</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Anda sudah check-in. Konfirmasi untuk menyelesaikan kehadiran di sesi ini.
          </p>
        </header>

        {checkoutLoading || sessionLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3" aria-busy="true" aria-label="Memuat data check-out">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Memuat data…</p>
          </div>
        ) : checkoutError || !myAttendance ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/40" role="alert">
            <p className="font-semibold text-red-800 dark:text-red-300">
              {checkoutError || 'Data check-in tidak ditemukan.'}
            </p>
            <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={() => navigate('/dashboard')}>
              Kembali ke dashboard
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kelas / Sesi</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {sessionDetails?.title || myAttendance.session_title}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Waktu check-in</p>
            <p className="mt-1 text-base font-medium text-indigo-600 dark:text-indigo-400">
              {format(new Date(myAttendance.check_in_time), 'dd MMM yyyy · HH:mm', { locale: idLocale })} WIB
            </p>
            <Button
              type="button"
              className="mt-8 min-h-12 w-full gap-2 text-lg font-bold"
              onClick={() => void handleCheckOut()}
              disabled={checkoutSubmitting}
              aria-busy={checkoutSubmitting}
            >
              <LogOut size={20} aria-hidden="true" />
              {checkoutSubmitting ? 'Memproses…' : 'Konfirmasi check-out'}
            </Button>
            <Button type="button" variant="outline" className="mt-3 min-h-11 w-full" onClick={() => navigate('/dashboard')}>
              Batal
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col p-4 sm:p-6">
      <header className="mb-4">
        <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-white">Check-in Kehadiran</h1>
        <p className="text-sm text-slate-600 dark:text-zinc-400">Ikuti 3 langkah: scan QR, pastikan lokasi, lalu foto bukti.</p>
      </header>

      <div className="mb-20 flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800 sm:mb-8">
        <AttendWizardHeader current={attendStep} qrSkipped={qrSkipped} />

        {isOffline && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 p-3 text-center text-sm font-medium text-amber-900" role="status">
            <WifiOff size={16} aria-hidden="true" />
            Mode offline: data absensi akan dikirim otomatis saat internet kembali.
          </div>
        )}

        {submitError && (
          <div
            className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40"
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
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200 dark:divide-zinc-700 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900">
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <QrCode className={scanResult ? 'text-green-500' : 'text-slate-400'} size={24} />
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">QR Code</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {sessionDetails?.qr_mode === 'NONE' ? 'Tidak Perlu' : scanResult ? 'Terscan' : 'Menunggu'}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <MapPin className={!location ? 'text-amber-500 animate-pulse' : isLocationValid() ? 'text-green-500' : 'text-red-500'} size={24} />
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">GPS Lokasi</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {!location ? (gpsError ? 'Error' : 'Mencari...') : isLocationValid() ? 'Akurat' : 'Di Luar Radius'}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <ShieldAlert className={!ipAddress ? 'text-slate-400' : isIpValid() ? 'text-green-500' : 'text-red-500'} size={24} />
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">IP Validasi</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {ipStatusLabel()}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <Camera className={photoBlob ? 'text-green-500' : 'text-amber-500'} size={24} />
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Foto Bukti</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {photoBlob ? 'Tersimpan' : 'Menunggu'}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          {/* Map Preview — langkah verify */}
          {attendStep !== 'scan' && location && sessionDetails?.location && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-inner z-0">
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

          <AttendStepPanel step={attendStep}>
            {attendStep === 'scan' && scanning ? (
              <div className="attend-qr-root w-full max-w-md">
                <div className="relative overflow-hidden rounded-2xl border-4 border-slate-100 bg-slate-900 shadow-2xl dark:border-zinc-800">
                  <div className="pointer-events-none absolute inset-0 z-10 m-8 rounded-xl border-[3px] border-dashed border-indigo-500/50" />
                  <div id="qr-reader" className="flex min-h-[300px] w-full flex-col bg-black [&>div]:border-none [&>div]:shadow-none [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
                </div>
                <div className="text-center mt-6 mb-6">
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                    Arahkan kamera ke QR Code yang ditampilkan oleh Dosen.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button type="button" variant="outline" onClick={switchQrCamera} className="gap-2">
                      <RefreshCw size={16} />
                      Kamera QR {qrFacingMode === 'environment' ? 'Belakang' : 'Depan'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : attendStep === 'verify' ? (
              <div className="w-full max-w-md space-y-4 text-center">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Verifikasi lokasi</h2>
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  Pastikan Anda berada di area kampus yang ditentukan. Jika GPS belum akurat, pindah ke tempat terbuka lalu tunggu beberapa detik.
                </p>
                {gpsError ? (
                  <p className="text-sm font-medium text-red-600" role="alert">{gpsError}</p>
                ) : null}
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  disabled={!location || !!gpsError}
                  onClick={() => setAttendStep('photo')}
                >
                  Lanjut ambil foto
                </Button>
                {!qrSkipped && (
                  <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => { setAttendStep('scan'); setScanning(true); }}>
                    Scan ulang QR
                  </Button>
                )}
              </div>
            ) : !photoBlob ? (
              <div className="w-full max-w-md flex flex-col items-center animate-in zoom-in duration-300">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 text-center">Ambil Foto Bukti Kehadiran</h2>
                
                <div className="w-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-zinc-700 bg-black aspect-video flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover absolute inset-0 z-10 ${isCameraActive ? 'block' : 'hidden'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  ></video>
                  
                  {!isCameraActive && (
                    <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center relative z-20">
                      <Camera size={48} className="mb-2 opacity-50" />
                      <p>{cameraPermissionError ? cameraPermissionError : 'Kamera belum aktif'}</p>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full justify-center relative z-10 px-4">
                  {!isCameraActive ? (
                    <Button type="button" className="min-h-11 w-full gap-2 sm:w-auto" onClick={() => startCamera()}>
                      <Camera size={20} aria-hidden="true" />
                      Buka Kamera
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
              <div className="w-full max-w-md flex flex-col items-center animate-in zoom-in duration-300">
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-zinc-700 mb-6">
                  <img 
                    src={photoPreview!} 
                    alt="Bukti Kehadiran" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center">Data Siap Dikirim</h2>
                <p className="text-slate-600 dark:text-zinc-400 mb-8 text-center px-4">
                  Sistem telah mendapatkan token QR, lokasi GPS, foto bukti, dan informasi perangkat Anda.
                </p>
                
                <div className="w-full space-y-3">
                  {/* [UX] A-02 — CTA kirim hanya di sticky footer mobile/desktop */}
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
                        if (sessionDetails?.qr_mode === 'NONE') {
                          setScanResult(NO_QR_TOKEN);
                          setScanning(false);
                        } else {
                          setScanResult(null);
                          setScanning(true);
                        }
                        setPhotoBlob(null);
                        setPhotoPreview(null);
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
          </AttendStepPanel>
        </div>

        {/* [IxD] A-02 — satu CTA kirim utama (sticky mobile, inline desktop) */}
        {attendStep === 'photo' && photoBlob && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={loading || !location || !!gpsError}
              className="min-h-12 w-full py-6 text-lg font-bold shadow-lg"
              aria-busy={loading}
            >
              {loading ? 'Memproses…' : 'Kirim absensi'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
