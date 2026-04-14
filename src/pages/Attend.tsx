import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '@/services/api';
import { toast } from 'sonner';
import { MapPin, QrCode, ShieldAlert, Camera, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const NO_QR_TOKEN = 'NO_QR_REQUIRED';

  const [scanResult, setScanResult] = useState<string | null>(tokenParam);
  const [scanning, setScanning] = useState(!tokenParam);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [sessionDetails, setSessionDetails] = useState<any>(null);

  // Camera state for photo evidence
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = React.useRef<Html5QrcodeScanner | null>(null);

  // Derived session ID from parameter or scan result
  const derivedSessionId = sessionParam || (scanResult?.includes(':') ? scanResult.split(':')[0].trim() : scanResult?.trim());

  useEffect(() => {
    if (!derivedSessionId || derivedSessionId === NO_QR_TOKEN) return;
    
    api.get(`/sessions/${derivedSessionId}`)
      .then(res => {
        const s = res.data.data;
        setSessionDetails(s);
        if (s.qr_mode === 'NONE') {
          setScanning(false);
          setScanResult(NO_QR_TOKEN);
        }
      })
      .catch(err => {
        console.error('Gagal mengambil data sesi', err);
        toast.error('Gagal mengambil detail sesi absensi.');
      });
  }, [derivedSessionId]);

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
    if (pos.coords.accuracy > 150) {
      setGpsError(`Akurasi lokasi terlalu rendah (${Math.round(pos.coords.accuracy)}m). Silakan ke area terbuka.`);
      toast.warning('Akurasi lokasi rendah. Cari tempat terbuka.');
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGpsAccuracy(pos.coords.accuracy);
      return;
    }
    
    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setGpsAccuracy(pos.coords.accuracy ?? null);
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
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0
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
  }, [scanning, scanResult]);

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

  const startCamera = async (mode = facingMode) => {
    try {
      setCameraPermissionError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraPermissionError('Browser Anda tidak mendukung akses kamera (HTTPS diperlukan).');
        toast.error('Browser Anda tidak mendukung akses kamera (HTTPS diperlukan).');
        return;
      }
      
      // Stop existing streams
      stopCamera();
      
      let stream;
      try {
        // Try exact facing mode first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: mode } } 
        });
      } catch (e: any) {
        // Fallback to any available video camera
        try {
           stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch(fallbackErr: any) {
           console.error('Camera fallback error:', fallbackErr);
           // Handle specific NotAllowedError vs NotFoundError
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

    setLoading(true);
    try {
      let sessionId = sessionParam;
      const qrToken = scanResult;

      if (!sessionId && scanResult.includes(':')) {
        sessionId = scanResult.split(':')[0];
      }

      if (!sessionId) {
        throw new Error('Sesi tidak ditemukan dalam QR Code atau URL.');
      }
      
      // Bersihkan whitespace jika ada (misal dari hasil scan)
      sessionId = sessionId.trim();

      const deviceFingerprint = localStorage.getItem('device_fingerprint') || 'unknown-device';

      const formData = new FormData();
      formData.append('session_id', sessionId);
      if (qrToken !== NO_QR_TOKEN) {
        formData.append('qr_token', qrToken);
      }
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('ip_address', ipAddress);
      formData.append('device_fingerprint', deviceFingerprint);
      
      if (photoBlob) {
        formData.append('photo', photoBlob, 'attendance.jpg');
      }

      const res = await api.post('/attendance/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(res.data.message || 'Check-in berhasil!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Check-in gagal');
      setScanResult(null);
      setScanning(true);
      setPhotoBlob(null);
      setPhotoPreview(null);
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Check-in Kehadiran</h1>
        <p className="text-slate-600 dark:text-zinc-400">Scan QR Code kelas dan pastikan Anda berada di lokasi.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden flex-1 flex flex-col mb-8">
        
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
              {!ipAddress ? 'Menunggu' : isIpValid() ? ipAddress : `${ipAddress} (Tidak Valid)`}
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

        <div className="flex-1 flex flex-col p-6 gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-md border border-slate-200 dark:border-zinc-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" />
                Lokasi Anda
              </h3>
              <div className="text-sm text-slate-600 dark:text-zinc-400 space-y-1">
                <div>
                  {location ? (
                    <>
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </>
                  ) : gpsError ? (
                    <span className="text-red-600 dark:text-red-400">GPS error</span>
                  ) : (
                    'Mencari lokasi...'
                  )}
                </div>
                {gpsAccuracy != null && (
                  <div>Akurasi ±{Math.round(gpsAccuracy)}m</div>
                )}
                {location && sessionDetails?.location && (
                  <div>
                    Jarak ke titik sesi: {Math.round(getDistanceMeters(location, { lat: sessionDetails.location.latitude, lng: sessionDetails.location.longitude }))}m
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={requestLocationOnce} className="w-full">
                  <RefreshCw size={16} className="mr-2" />
                  Perbarui Lokasi
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-md border border-slate-200 dark:border-zinc-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" />
                Peta Lokasi
              </h3>
              <div className="h-[220px] rounded-xl overflow-hidden relative z-0 bg-slate-100 dark:bg-zinc-900">
                {location ? (
                  <MapContainer 
                    center={[location.lat, location.lng]} 
                    zoom={16} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <MapUpdater center={[location.lat, location.lng]} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[location.lat, location.lng]}>
                      <Popup>Lokasi Anda Saat Ini</Popup>
                    </Marker>
                    {sessionDetails?.location && (
                      <Circle 
                        center={[sessionDetails.location.latitude, sessionDetails.location.longitude]}
                        radius={sessionDetails.location.radius}
                        pathOptions={{ color: 'indigo', fillColor: 'indigo', fillOpacity: 0.2 }}
                      />
                    )}
                  </MapContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-slate-500 dark:text-zinc-500">
                    {gpsError ? 'Izin lokasi belum aktif' : 'Menunggu GPS...'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {scanning ? (
              <div className="w-full max-w-md animate-in fade-in duration-500">
                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-zinc-800 relative">
                  <div className="absolute inset-0 z-10 border-[3px] border-dashed border-indigo-500/50 m-8 rounded-xl pointer-events-none"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite] z-20 pointer-events-none"></div>
                  
                  <div id="qr-reader" className="w-full bg-black [&>div]:border-none [&>div]:shadow-none [&_video]:object-cover [&_video]:w-full [&_video]:h-full min-h-[300px] flex flex-col-reverse justify-end"></div>
                </div>
                <style dangerouslySetInnerHTML={{__html: `
                  #qr-reader__dashboard_section_csr span button {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    border: none !important;
                    padding: 10px 20px !important;
                    border-radius: 8px !important;
                    margin: 10px 0 !important;
                    cursor: pointer !important;
                    font-weight: 600 !important;
                    width: 100% !important;
                  }
                  #qr-reader__dashboard_section_csr span button:hover {
                    background-color: #4338ca !important;
                  }
                  #qr-reader__dashboard_section_swaplink {
                    color: #ffffff !important;
                    background-color: #334155 !important;
                    text-decoration: none !important;
                    margin-top: 10px !important;
                    margin-bottom: 10px !important;
                    display: block !important;
                    padding: 10px !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                  }
                  #qr-reader__dashboard_section_swaplink:hover {
                    background-color: #475569 !important;
                  }
                  #qr-reader__dashboard_section_csr {
                    padding: 15px !important;
                    background-color: #1e293b !important;
                    border-top: 1px solid #334155 !important;
                    color: white !important;
                    position: relative;
                    z-index: 10;
                  }
                  #qr-reader__scan_region {
                    position: relative;
                    z-index: 1;
                  }
                `}} />
                <div className="text-center mt-6 mb-6">
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                    Arahkan kamera ke QR Code yang ditampilkan oleh Dosen.
                  </p>
                </div>
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
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        startCamera();
                      }}
                      className="flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg transition-colors cursor-pointer w-full sm:w-auto"
                    >
                      <Camera size={20} />
                      <span>Buka Kamera</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          switchCamera();
                        }}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium shadow-lg transition-colors cursor-pointer w-full sm:w-auto"
                      >
                        <RefreshCw size={20} />
                        <span>Kamera {facingMode === 'user' ? 'Depan' : 'Belakang'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          takePhoto();
                        }}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg transition-colors cursor-pointer w-full sm:w-auto"
                      >
                        <Camera size={20} />
                        <span>Ambil Foto</span>
                      </button>
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
                  <Button
                    size="lg"
                    onClick={handleCheckIn}
                    disabled={loading || !location}
                    className="w-full py-6 font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                  >
                    {loading ? 'Memproses...' : 'Kirim Data Absensi'}
                  </Button>
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
          </div>
        </div>

      </div>
    </div>
  );
}
