import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import QRCode from 'qrcode';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Users, Clock, ArrowLeft, CheckCircle2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Session {
  id: string;
  title: string;
  qr_mode: 'DYNAMIC' | 'STATIC' | 'NONE';
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

interface Attendee {
  id: string;
  user_name: string;
  nim_nip: string;
  status: string;
  check_in_time: string;
}

export default function QRDisplay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [session, setSession] = useState<Session | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [countdown, setCountdown] = useState(15);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchSession();
    fetchAttendees();
    
    // Init Socket
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    socketRef.current = io(socketUrl, {
      auth: { token: accessToken }
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_session', id);
    });

    socketRef.current.on('new_attendance', (data: Attendee) => {
      setAttendees(prev => [data, ...prev]);
      toast.success(`${data.user_name} berhasil absen!`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_session', id);
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  useEffect(() => {
    if (session && session.qr_mode !== 'NONE' && session.status === 'ACTIVE') {
      fetchQR();
      
      if (session.qr_mode === 'DYNAMIC') {
        const interval = setInterval(() => {
          fetchQR();
          setCountdown(15);
        }, 15000);

        const countdownInterval = setInterval(() => {
          setCountdown(prev => (prev > 0 ? prev - 1 : 15));
        }, 1000);

        return () => {
          clearInterval(interval);
          clearInterval(countdownInterval);
        };
      }
    }
  }, [session]);

  useEffect(() => {
    if (qrData && canvasRef.current) {
      // Create a URL for attendance scanning
      const attendUrl = `${window.location.origin}/attend?session=${id}&token=${qrData}`;
      QRCode.toCanvas(canvasRef.current, attendUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1e1b4b', // Zinc 950
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [qrData, id]);

  const fetchSession = async () => {
    try {
      const res = await api.get(`/sessions/${id}`);
      setSession(res.data.data);
    } catch (error) {
      toast.error('Gagal mengambil data sesi');
    }
  };

  const fetchAttendees = async () => {
    try {
      const res = await api.get(`/sessions/${id}/attendances`);
      setAttendees(res.data.data.map((att: any) => ({
        id: att.id,
        user_name: att.user.name,
        nim_nip: att.user.nim_nip,
        status: att.status,
        check_in_time: att.check_in_time
      })));
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
      // Menghilangkan toast error di sini agar tidak mengganggu jika sesi belum dimulai
    }
  };

  const fetchQR = async () => {
    try {
      const res = await api.get(`/sessions/${id}/qr`);
      setQrData(res.data.data.token);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menghasilkan QR');
    }
  };

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary canvas to draw the QR code with a white background and title
    const sourceCanvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) return;

    // Set dimensions with padding for text
    tempCanvas.width = sourceCanvas.width + 40;
    tempCanvas.height = sourceCanvas.height + 100;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw Title
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(session?.title || 'QR Kehadiran', tempCanvas.width / 2, 40);

    // Draw subtitle (Status/Mode)
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial';
    ctx.fillText(`Mode: ${session?.qr_mode} | Diunduh: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, tempCanvas.width / 2, 65);

    // Draw the actual QR Code
    ctx.drawImage(sourceCanvas, 20, 80);

    // Convert to image and download
    const url = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${session?.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR Code berhasil diunduh');
  };

  if (!session) return <div className="flex items-center justify-center h-screen">Memuat...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/sessions')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{session.title}</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Mode QR: <span className="font-semibold">{session.qr_mode}</span> | 
              Status: <span className={`font-semibold ${session.status === 'ACTIVE' ? 'text-green-500' : 'text-amber-500'}`}>{session.status}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <Users className="text-indigo-600 dark:text-indigo-400" size={20} />
          <span className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">{attendees.length} Hadir</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 border-r border-slate-200 dark:border-zinc-800">
          {session.status === 'ACTIVE' ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-zinc-800 flex flex-col items-center">
              <canvas ref={canvasRef} className="rounded-xl overflow-hidden"></canvas>
              
              <div className="mt-8 text-center w-full">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Scan untuk Absen</h2>
                <p className="text-slate-500 dark:text-zinc-400 mb-6">Gunakan kamera HP atau aplikasi web untuk scan</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  {session.qr_mode === 'DYNAMIC' && (
                    <div className="flex items-center justify-center gap-3 bg-slate-100 dark:bg-zinc-800 py-3 px-6 rounded-full border border-slate-200 dark:border-zinc-700">
                      <Clock size={20} className="text-slate-500 dark:text-zinc-400" />
                      <span className="text-slate-700 dark:text-zinc-300 font-medium">Diperbarui dalam:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xl w-8 text-center">{countdown}s</span>
                    </div>
                  )}

                  {session.qr_mode === 'STATIC' && (
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-full font-medium transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Download size={18} />
                      Unduh QR (Cetak)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock size={40} className="text-slate-400 dark:text-zinc-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Sesi Tidak Aktif</h2>
              <p className="text-slate-600 dark:text-zinc-400">
                Sesi ini saat ini berstatus {session.status}. QR Code hanya ditampilkan saat sesi sedang aktif.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Live Attendees List */}
        <div className="w-full lg:w-96 bg-white dark:bg-zinc-900 flex flex-col h-full border-t lg:border-t-0 border-slate-200 dark:border-zinc-800">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-white">Live Feed Kehadiran</h3>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {attendees.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-zinc-500 py-8">
                Belum ada yang absen
              </div>
            ) : (
              attendees.map((att) => (
                <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl animate-in slide-in-from-left-2 duration-300">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{att.user_name}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{att.nim_nip || '-'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${att.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {att.status}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                      {format(new Date(att.check_in_time), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}