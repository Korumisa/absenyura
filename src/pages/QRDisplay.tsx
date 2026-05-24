import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Users, Clock, ArrowLeft, CheckCircle2, Download, Maximize2, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { SessionSummary } from '@/types/session';
import { Attendee } from '@/types/qrdisplay';
import { Button } from '@/components/ui/button';

const QR_ROTATE_MS = 15_000;
const QR_PREFETCH_AT_MS = 12_000;

export default function QRDisplay() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [countdown, setCountdown] = useState(15);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fsRootRef = useRef<HTMLDivElement>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/sessions/${sessionId}`);
      setSession(res.data.data);
    } catch {
      toast.error('Gagal mengambil data sesi');
    }
  }, [sessionId]);

  const fetchAttendees = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/sessions/${sessionId}/attendances?_t=${Date.now()}`);
      setAttendees(
        res.data.data.map((att: {
          id: string;
          user: { name: string; nim_nip: string };
          status: string;
          check_in_time: string;
          check_out_time: string | null;
        }) => ({
          id: att.id,
          user_name: att.user.name,
          nim_nip: att.user.nim_nip,
          status: att.status,
          check_in_time: att.check_in_time,
          check_out_time: att.check_out_time,
        })),
      );
    } catch {
      console.error('Failed to fetch attendees');
    }
  }, [sessionId]);

  const fetchQR = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/sessions/${sessionId}/qr`);
      const token = res.data.data.token;
      const url = `${window.location.origin}/attend?session=${sessionId}&token=${encodeURIComponent(token)}`;
      setQrData(url);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Gagal menghasilkan QR');
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!sessionId) return;
    fetchAttendees();
    const intervalId = setInterval(fetchAttendees, 5000);
    return () => clearInterval(intervalId);
  }, [sessionId, fetchAttendees]);

  useEffect(() => {
    if (session && session.qr_mode !== 'NONE' && session.status === 'ACTIVE') {
      fetchQR();

      if (session.qr_mode === 'DYNAMIC') {
        const interval = setInterval(() => {
          fetchQR();
          setCountdown(15);
        }, QR_ROTATE_MS);

        const countdownInterval = setInterval(() => {
          setCountdown((prev) => (prev > 0 ? prev - 1 : 15));
        }, 1000);

        return () => {
          clearInterval(interval);
          clearInterval(countdownInterval);
        };
      }
    }
  }, [session, fetchQR]);

  useEffect(() => {
    if (!session || session.qr_mode !== 'DYNAMIC' || session.status !== 'ACTIVE' || !qrData) return;
    const timeoutId = setTimeout(() => fetchQR(), QR_PREFETCH_AT_MS);
    return () => clearTimeout(timeoutId);
  }, [qrData, session, fetchQR]);

  useEffect(() => {
    if (!qrData || !canvasRef.current) return;
    const size = isFullscreen ? 520 : 400;
    QRCode.toCanvas(
      canvasRef.current,
      qrData,
      {
        width: size,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      },
      (error) => {
        if (error) console.error(error);
      },
    );
  }, [qrData, isFullscreen]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await fsRootRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Mode layar penuh tidak didukung di browser ini.');
    }
  };

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const sourceCanvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    tempCanvas.width = sourceCanvas.width + 40;
    tempCanvas.height = sourceCanvas.height + 100;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(session?.title || 'QR Kehadiran', tempCanvas.width / 2, 40);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial';
    ctx.fillText(`Mode: ${session?.qr_mode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, tempCanvas.width / 2, 65);
    ctx.drawImage(sourceCanvas, 20, 80);

    const url = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${session?.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code berhasil diunduh');
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950" aria-busy="true" aria-label="Memuat sesi">
        <p className="text-slate-600 dark:text-zinc-400">Memuat sesi…</p>
      </div>
    );
  }

  const attendeeBadge = (
    <div
      className={`flex items-center gap-4 rounded-2xl border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ${
        isFullscreen ? 'px-10 py-6' : 'px-6 py-3'
      }`}
      role="status"
      aria-live="polite"
      aria-label={`${attendees.length} mahasiswa sudah hadir`}
    >
      <Users className={`text-emerald-600 dark:text-emerald-400 ${isFullscreen ? 'h-14 w-14' : 'h-10 w-10'}`} aria-hidden="true" />
      <div>
        <p className={`font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
          Sudah absen
        </p>
        <p className={`font-black tabular-nums text-emerald-700 dark:text-emerald-200 ${isFullscreen ? 'text-7xl' : 'text-4xl'}`}>
          {attendees.length}
        </p>
      </div>
    </div>
  );

  return (
    <div ref={fsRootRef} className="flex min-h-screen flex-col bg-slate-50 dark:bg-zinc-950">
      {!isFullscreen && (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => navigate('/sessions')} aria-label="Kembali ke daftar sesi">
              <ArrowLeft size={24} aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{session.title}</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Mode QR: <span className="font-semibold">{session.qr_mode}</span> · Status:{' '}
                <span className={session.status === 'ACTIVE' ? 'font-semibold text-green-600' : 'font-semibold text-amber-500'}>
                  {session.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {attendeeBadge}
            <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={toggleFullscreen} aria-pressed={isFullscreen}>
              <Maximize2 size={18} aria-hidden="true" />
              Layar penuh
            </Button>
          </div>
        </header>
      )}

      <main className={`flex flex-1 flex-col overflow-hidden ${isFullscreen ? 'bg-slate-900' : 'lg:flex-row'}`}>
        <div
          className={`flex flex-1 flex-col items-center justify-center p-8 ${
            isFullscreen ? '' : 'border-r border-slate-200 dark:border-zinc-800'
          }`}
        >
          {isFullscreen ? (
            <div className="mb-8 flex w-full max-w-5xl items-center justify-between px-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{session.title}</h1>
                <p className="text-indigo-200">Scan QR untuk absensi</p>
              </div>
              <div className="flex items-center gap-4">
                {attendeeBadge}
                <Button type="button" variant="secondary" className="min-h-11 gap-2" onClick={toggleFullscreen}>
                  <Minimize2 size={18} aria-hidden="true" />
                  Keluar
                </Button>
              </div>
            </div>
          ) : null}

          {session.status === 'ACTIVE' ? (
            <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <canvas ref={canvasRef} className="overflow-hidden rounded-xl" aria-label="Kode QR absensi" />
              <div className="mt-8 w-full text-center">
                <h2 className={`font-bold text-slate-800 dark:text-white ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>Scan untuk absen</h2>
                <p className="mb-6 text-slate-500 dark:text-zinc-400">Arahkan kamera HP ke layar ini</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {session.qr_mode === 'DYNAMIC' && (
                    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-100 px-6 py-3 dark:border-zinc-700 dark:bg-zinc-800">
                      <Clock size={20} className="text-slate-500" aria-hidden="true" />
                      <span className="font-medium text-slate-700 dark:text-zinc-300">QR baru dalam</span>
                      <span className="w-10 text-center text-2xl font-bold text-indigo-600 dark:text-indigo-400" aria-live="polite">
                        {countdown}s
                      </span>
                    </div>
                  )}
                  {session.qr_mode === 'STATIC' && (
                    <Button type="button" onClick={handleDownloadQR} className="min-h-11 gap-2">
                      <Download size={18} aria-hidden="true" />
                      Unduh QR
                    </Button>
                  )}
                  {!isFullscreen && (
                    <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={toggleFullscreen}>
                      <Maximize2 size={18} aria-hidden="true" />
                      Proyektor
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md text-center">
              <Clock size={40} className="mx-auto mb-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Sesi belum aktif</h2>
              <p className="text-slate-600 dark:text-zinc-400">QR hanya tampil saat status sesi ACTIVE.</p>
            </div>
          )}
        </div>

        {!isFullscreen && (
          <aside className="flex w-full flex-col border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:w-96 lg:border-t-0">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="font-bold text-slate-800 dark:text-white">Kehadiran live</h2>
              <span className="relative flex h-3 w-3" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
            </div>
            <div className="max-h-[50vh] flex-1 space-y-3 overflow-y-auto p-4 lg:max-h-none">
              {attendees.length === 0 ? (
                <p className="py-8 text-center text-slate-500">Belum ada yang absen</p>
              ) : (
                attendees.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        att.check_out_time
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}
                    >
                      {att.check_out_time ? <CheckCircle2 size={20} aria-hidden="true" /> : <Clock size={20} aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{att.user_name}</p>
                      <p className="text-xs text-slate-500">{att.nim_nip || '-'}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-600">
                      {format(new Date(att.check_out_time || att.check_in_time), 'HH:mm', { locale: idLocale })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
