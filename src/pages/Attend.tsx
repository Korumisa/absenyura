import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '@/services/api';
import { toast } from 'sonner';
import { MapPin, QrCode, ShieldAlert, CheckCircle, Smartphone, Camera } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
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

export default function Attend() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionParam = searchParams.get('session');
  const tokenParam = searchParams.get('token');

  const [scanResult, setScanResult] = useState<string | null>(tokenParam);
  const [scanning, setScanning] = useState(!tokenParam);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);

  // Fetch session details if session ID is provided in URL
  useEffect(() => {
    const fetchSession = async () => {
      if (sessionParam) {
        try {
          const res = await api.get('/sessions');
          const currentSession = res.data.data.find((s: any) => s.id === sessionParam);
          if (currentSession) {
            setSessionDetails(currentSession);
            // If QR mode is NONE, skip scanning
            if (currentSession.qr_mode === 'NONE') {
              setScanning(false);
              setScanResult('NO_QR_REQUIRED');
            }
          }
        } catch (error) {
          console.error('Failed to fetch session details');
        }
      }
    };
    fetchSession();
  }, [sessionParam]);
  
  // Camera state for photo evidence
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    // Fetch session details to check QR Mode
    if (sessionParam) {
      api.get(`/sessions/${sessionParam}`)
        .then(res => {
          const s = res.data.data;
          setSessionDetails(s);
          if (s.qr_mode === 'NONE') {
            setScanning(false);
            setScanResult('NONE_MODE'); // dummy token
          }
        })
        .catch(err => console.error('Gagal mengambil data sesi', err));
    }

    // Get IP address (Public) for Layer 3 validation
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(err => console.error('Gagal mengambil IP', err));

    // Get Geolocation for Layer 2 validation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => toast.error('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.')
      );
    } else {
      toast.error('Browser Anda tidak mendukung Geolocation.');
    }
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (scanning && !scanResult) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Pause scanner to prevent multiple rapid scans
          if (scanner) {
            scanner.pause();
          }
          setScanResult(decodedText);
          setScanning(false);
        },
        (err) => {
          // Ignore scan failures, they happen constantly until a code is found
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error('Gagal membersihkan scanner', e));
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      toast.error('Gagal mengakses kamera. Pastikan izin kamera diaktifkan.');
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add watermark
        ctx.font = '14px Arial';
        ctx.fillStyle = 'yellow';
        ctx.fillText(`${new Date().toLocaleString()}`, 10, canvas.height - 30);
        if (location) {
          ctx.fillText(`Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`, 10, canvas.height - 10);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
            setPhotoPreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
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
      let qrToken = scanResult;

      if (!sessionId && scanResult.includes(':')) {
        sessionId = scanResult.split(':')[0];
      }

      if (!sessionId) {
        throw new Error('Sesi tidak ditemukan dalam QR Code atau URL.');
      }

      const deviceFingerprint = localStorage.getItem('device_fingerprint') || 'unknown-device';

      const formData = new FormData();
      formData.append('session_id', sessionId);
      if (qrToken !== 'NO_QR_REQUIRED') {
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

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Check-in Kehadiran</h1>
        <p className="text-slate-600 dark:text-zinc-400">Scan QR Code kelas dan pastikan Anda berada di lokasi.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden flex-1 flex flex-col">
        
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
            <MapPin className={location ? 'text-green-500' : 'text-amber-500 animate-pulse'} size={24} />
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">GPS Lokasi</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {location ? 'Akurat' : 'Mencari...'}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <ShieldAlert className={ipAddress ? 'text-green-500' : 'text-slate-400'} size={24} />
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">IP Validasi</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {ipAddress ? ipAddress : 'Menunggu'}
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

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {scanning ? (
            <div className="w-full max-w-md animate-in fade-in duration-500">
              <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-zinc-800 relative">
                {/* Decorative scanning overlay */}
                <div className="absolute inset-0 z-10 border-[3px] border-dashed border-indigo-500/50 m-8 rounded-xl pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite] z-20 pointer-events-none"></div>
                
                <div id="qr-reader" className="w-full bg-black [&>div]:border-none [&>div]:shadow-none [&_video]:object-cover [&_video]:w-full [&_video]:h-full min-h-[300px] flex flex-col justify-center"></div>
              </div>
              <div className="text-center mt-6 mb-6">
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                  Arahkan kamera ke QR Code yang ditampilkan oleh Dosen.
                </p>
              </div>

              {location && sessionDetails?.location && (
                <div className="mt-4 bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-md border border-slate-200 dark:border-zinc-700">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-500" />
                    Peta Lokasi Anda
                  </h3>
                  <div className="h-[200px] rounded-xl overflow-hidden relative z-0">
                    <MapContainer 
                      center={[location.lat, location.lng]} 
                      zoom={16} 
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      dragging={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[location.lat, location.lng]}>
                        <Popup>Lokasi Anda Saat Ini</Popup>
                      </Marker>
                      <Circle 
                        center={[sessionDetails.location.latitude, sessionDetails.location.longitude]}
                        radius={sessionDetails.location.radius}
                        pathOptions={{ color: 'indigo', fillColor: 'indigo', fillOpacity: 0.2 }}
                      />
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          ) : !photoBlob ? (
            <div className="w-full max-w-md flex flex-col items-center animate-in zoom-in duration-300">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 text-center">Ambil Foto Bukti Kehadiran</h2>
              
              <div className="w-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-zinc-700 bg-black aspect-video flex items-center justify-center">
                {!isCameraActive ? (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Camera size={48} className="mb-2 opacity-50" />
                    <p>Kamera belum aktif</p>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover absolute inset-0 z-10"></video>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
              </div>
              
              <div className="mt-6 flex gap-4 w-full justify-center relative z-50">
                {!isCameraActive ? (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      startCamera();
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg transition-colors cursor-pointer w-full max-w-[200px]"
                  >
                    <Camera size={20} />
                    <span>Buka Kamera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      takePhoto();
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg transition-colors cursor-pointer w-full max-w-[200px]"
                  >
                    <Camera size={20} />
                    <span>Ambil Foto</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center animate-in zoom-in duration-300">
              <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-zinc-700 mb-6">
                <img src={photoPreview!} alt="Bukti Kehadiran" className="w-full h-full object-cover" />
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
                      setScanResult(null);
                      setScanning(true);
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
  );
}