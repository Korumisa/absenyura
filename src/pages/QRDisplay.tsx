import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Users, Clock, ArrowLeft, CheckCircle2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { SessionSummary } from '@/types/session';
import { Attendee } from '@/types/qrdisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const QR_ROTATE_MS = 15_000;
const QR_PREFETCH_AT_MS = 12_000;
const QR_SIZE = 380;

export default function QRDisplay() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [qrData, setQrData] = useState('');
  const [countdown, setCountdown] = useState(15);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    QRCode.toCanvas(
      canvasRef.current,
      qrData,
      {
        width: QR_SIZE,
        margin: 2,
        color: { dark: '#1e3a8a', light: '#ffffff' },
      },
      (error) => {
        if (error) console.error(error);
      },
    );
  }, [qrData]);

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
    ctx.fillStyle = '#1e3a8a';
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100" aria-busy="true" aria-label="Memuat sesi">
        <p className="text-slate-600">Memuat sesi…</p>
      </div>
    );
  }

  const isActive = session.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 shrink-0"
              onClick={() => navigate('/sessions')}
              aria-label="Kembali ke daftar sesi"
            >
              <ArrowLeft size={22} aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-900">{session.title}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                QR {session.qr_mode === 'DYNAMIC' ? 'Dinamis' : session.qr_mode === 'STATIC' ? 'Statis' : 'Nonaktif'}
                {' · '}
                <span className={isActive ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                  {session.status}
                </span>
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-5 py-2.5"
            role="status"
            aria-live="polite"
            aria-label={`${attendees.length} mahasiswa sudah hadir`}
          >
            <Users className="h-8 w-8 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Sudah absen</p>
              <p className="text-3xl font-black tabular-nums leading-none text-emerald-700">{attendees.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* QR utama */}
        <section className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {isActive ? (
            <>
              <div className="rounded-2xl border-4 border-indigo-100 bg-white p-4 shadow-inner">
                <canvas ref={canvasRef} className="block" aria-label="Kode QR absensi" />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900">Scan untuk absen</h2>
              <p className="mt-1 text-center text-slate-500">Arahkan kamera HP mahasiswa ke layar ini</p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {session.qr_mode === 'DYNAMIC' && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-800 ring-1 ring-indigo-100">
                    <Clock size={18} aria-hidden="true" />
                    QR baru dalam
                    <span className="text-xl font-bold tabular-nums" aria-live="polite">
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
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <Clock size={48} className="mx-auto mb-4 text-slate-300" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-800">Sesi belum aktif</h2>
              <p className="mt-2 text-slate-500">QR hanya ditampilkan saat status sesi ACTIVE.</p>
            </div>
          )}
        </section>

        {/* Kehadiran live */}
        <aside className="flex max-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h2 className="font-bold text-slate-800">Kehadiran live</h2>
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {attendees.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">Belum ada yang absen</p>
            ) : (
              attendees.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      att.check_out_time ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    {att.check_out_time ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : (
                      <Clock size={18} aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{att.user_name}</p>
                    <p className="text-xs text-slate-500">{att.nim_nip || '-'}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {format(new Date(att.check_out_time || att.check_in_time), 'HH:mm', { locale: idLocale })}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
