import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  X,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Excuse } from '@/types/excuse';
import { cn } from '@/lib/utils/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatClassLabel } from '@/lib/utils/classLabel';
import AdminPageShell from '@/components/AdminPageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import { excuseStatusLabel } from '@/lib/utils/statusLabel';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { useMutationToast } from '@/hooks/useMutationToast';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { TablePagination } from '@/components/ui/TablePagination';
import { FileText as FileTextIcon } from 'lucide-react';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  acquireCameraStream,
  humanizeCameraError,
  releaseMediaStream,
  waitForCameraRelease,
  releaseActiveVideoTracks,
} from '@/lib/media/camera';

export default function Excuses() {
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<
    {
      id: string;
      title: string;
      session_start: string;
      class?: { name: string; semester: number } | null;
      session_classes?: { class: { name: string; semester: number } }[];
    }[]
  >([]);

  const [formData, setFormData] = useState({
    session_id: '',
    reason: 'SICK',
    description: '',
  });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewConfirm, setReviewConfirm] = useState<{
    id: string;
    status: 'APPROVED' | 'REJECTED';
    studentName: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);

  const clearPhoto = () => {
    setPhotoBlob(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setCameraError(null);
  };

  const stopCamera = () => {
    // Release any pending stream that hasn't been assigned yet
    if (pendingStreamRef.current) {
      releaseMediaStream(pendingStreamRef.current);
      pendingStreamRef.current = null;
    }
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      releaseMediaStream(stream);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Camera: dilepas HANYA saat unmount — jangan gabungkan dengan photoPreviewUrl
  // sebab cleanup effect dengan deps [photoPreviewUrl] akan memanggil stopCamera()
  // setiap kali URL berubah, termasuk saat retakePhoto() sedang mengakuisisi stream baru.

  useEffect(() => {
    return () => {
      stopCamera();
      void releaseActiveVideoTracks();
    };
  }, []);

  // When isCameraActive flips to true the container's `hidden` class is removed.
  // We use requestAnimationFrame so the browser has painted the now-visible <video>
  // before we assign the stream and call play(). This avoids the mobile Android
  // Chrome bug where play() on a display:none element silently skips decoder init.
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

  // URL revocation: closure menangkap nilai lama — ini benar untuk revoke URL lama
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const startCamera = async (mode = facingMode) => {
    if (cameraStarting) return;
    setCameraStarting(true);
    setCameraError(null);
    try {
      stopCamera();
      await waitForCameraRelease(400);

      // Retry loop — hardware kamera kadang butuh waktu extra untuk dilepas
      // (terutama setelah navigasi dari halaman Attend yang pakai QR scanner)
      let lastErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await waitForCameraRelease(600 + attempt * 300); // 600ms, 900ms
        }
        try {
          const stream = await acquireCameraStream({
            facingMode: mode,
            preferRear: mode === 'environment',
          });
          // Store stream in ref — the useEffect watching isCameraActive will
          // pick it up and assign it to the <video> after React re-renders
          // and the container's `hidden` class is removed.
          pendingStreamRef.current = stream;
          setIsCameraActive(true);
          return;
        } catch (err) {
          lastErr = err;
        }
      }

      const msg = humanizeCameraError(lastErr);
      setCameraError(msg);
      toast.error(msg);
    } finally {
      setCameraStarting(false);
    }
  };

  const switchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (isCameraActive) void startCamera(next);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const MAX_WIDTH = 900;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.font = '14px Arial';
    ctx.fillStyle = 'yellow';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(`${new Date().toLocaleString()}`, 10, canvas.height - 10);
    ctx.shadowBlur = 0;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhotoBlob(blob);
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        setPhotoPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      'image/jpeg',
      0.75
    );
  };

  const retakePhoto = () => {
    clearPhoto();
    void startCamera();
  };

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const swr = useSWR<Excuse[]>('/excuses', fetcher, { revalidateOnFocus: false });
  const {
    data: excuses = [],
    isPending: loading,
    isError,
    showSlowLoadingHint,
    retry,
    mutate,
  } = useSwrPageState(swr);
  const hasFilters = Boolean(searchTerm.trim()) || statusFilter !== 'ALL' || reasonFilter !== 'ALL';

  const doReview = useMutationToast(
    async () => {
      if (!reviewConfirm) return undefined as unknown as void;
      return api.put(`/excuses/${reviewConfirm.id}/review`, { status: reviewConfirm.status });
    },
    {
      successMsg: () =>
        reviewConfirm
          ? `Pengajuan izin ${reviewConfirm.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`
          : 'Berhasil',
      errorMsg: (err) => toastErrorMessage(err, 'Gagal mereview pengajuan izin'),
    }
  );

  const resolveProofUrl = (proofUrl: string | null | undefined) => {
    if (!proofUrl) return null;
    if (proofUrl.startsWith('http') || proofUrl.startsWith('data:')) return proofUrl;
    const apiBase = String(import.meta.env.VITE_API_BASE_URL || '/api');
    const assetBase = apiBase.startsWith('http')
      ? new URL(apiBase).origin
      : apiBase.replace(/\/api\/?$/, '');
    return `${assetBase}${proofUrl}`;
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      // Filter sessions that are active or upcoming
      setSessions(res.data.data.filter((s: any) => s.status !== 'CLOSED'));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'USER') {
      fetchSessions();
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.session_id) {
      toast.error('Pilih sesi kelas terlebih dahulu');
      return;
    }
    if (!photoBlob) {
      toast.error('Ambil foto bukti terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      const photoType = photoBlob.type || 'image/jpeg';
      const challengeRes = await api.get('/excuses/challenge', {
        params: {
          session_id: formData.session_id,
          photo_size: photoBlob.size,
          photo_type: photoType,
        },
      });
      const nonce = challengeRes.data?.data?.nonce;
      const signature = challengeRes.data?.data?.signature;
      if (!nonce || !signature) {
        throw new Error('Gagal mendapatkan security token dari server');
      }

      const form = new FormData();
      form.append('session_id', formData.session_id);
      form.append('reason', formData.reason);
      form.append('description', formData.description);
      form.append('nonce', nonce);
      form.append('signature', signature);
      form.append('photo_size', photoBlob.size.toString());
      form.append('photo_type', photoType);
      form.append('proof', photoBlob, 'excuse.jpg');

      const idempotencyKey = crypto.randomUUID();
      await api.post('/excuses', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Idempotency-Key': idempotencyKey,
        },
      });
      toast.success('Pengajuan izin berhasil dikirim');
      setIsModalOpen(false);
      setFormData({ session_id: '', reason: 'SICK', description: '' });
      clearPhoto();
      mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Terjadi kesalahan saat mengajukan izin'));
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewConfirm = (id: string, status: 'APPROVED' | 'REJECTED', studentName: string) => {
    setReviewConfirm({ id, status, studentName });
  };

  const confirmReview = async () => {
    if (!reviewConfirm || reviewingId) return;
    const { id } = reviewConfirm;
    setReviewingId(id);
    try {
      const result = await doReview();
      if (result !== undefined) {
        mutate();
        setReviewConfirm(null);
      }
    } finally {
      setReviewingId(null);
    }
  };

  const actionOverlayLabel = submitting
    ? 'Mengirim pengajuan izin…'
    : reviewingId
      ? 'Memproses tinjauan…'
      : null;

  const filteredExcuses = excuses.filter((ex) => {
    const matchSearch =
      (ex.user?.name && ex.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.session?.title && ex.session.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    if (statusFilter !== 'ALL' && ex.status !== statusFilter) return false;
    if (reasonFilter !== 'ALL' && ex.reason !== reasonFilter) return false;

    return true;
  });

  const {
    paginatedItems: paginatedExcuses,
    meta: excusesPaginationMeta,
    setPage: setExcusesPage,
  } = useClientPagination(filteredExcuses, {
    pageSize: 20,
    resetDeps: [searchTerm, statusFilter, reasonFilter],
  });

  const exportCsv = () => {
    const escapeCsv = (value: unknown) => {
      const raw = String(value ?? '');
      const normalized = raw.replace(/\r?\n/g, ' ').trim();
      if (/[",]/.test(normalized)) return `"${normalized.replace(/"/g, '""')}"`;
      return normalized;
    };

    const rows = filteredExcuses.map((ex) => {
      const proof =
        ex.proof_url && (ex.proof_url.startsWith('http') || ex.proof_url.startsWith('data:'))
          ? ex.proof_url
          : ex.proof_url
            ? resolveProofUrl(ex.proof_url)
            : '';
      return [
        ex.id,
        ex.user?.name ?? '',
        ex.user?.nim_nip ?? '',
        ex.session?.title ?? '',
        (() => {
          const labels =
            (ex.session as any)?.session_classes?.flatMap((x: any) => {
              const result = formatClassLabel(x?.class);
              return result ? [result] : [];
            }) ?? [];
          if (labels.length) return labels.join(', ');
          return ex.session?.class ? formatClassLabel(ex.session.class) : '';
        })(),
        ex.reason ?? '',
        ex.status ?? '',
        ex.description ?? '',
        ex.reviewer?.name ?? '',
        ex.created_at ?? '',
        ex.session?.session_start ?? '',
        proof,
      ]
        .map(escapeCsv)
        .join(',');
    });

    const header = [
      'id',
      'nama',
      'nim',
      'sesi',
      'kelas',
      'alasan',
      'status',
      'keterangan',
      'reviewer',
      'dibuat_pada',
      'jadwal_sesi',
      'bukti_url',
    ].join(',');

    const content = `\uFEFF${header}\n${rows.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pengajuan-izin-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Unduh CSV berhasil');
  };

  return (
    <>
      <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
      <AdminPageShell
        title="Pengajuan Izin & Sakit"
        description={
          currentUser?.role === 'USER' ? (
            <>
              Ajukan izin atau sakit untuk sesi yang Anda lewatkan.{' '}
              <Link to="/excuses/me" className="text-brand hover:underline underline-offset-2">
                Lihat semua pengajuan saya →
              </Link>
            </>
          ) : (
            'Kelola dan review pengajuan izin mahasiswa.'
          )
        }
        variant="plain"
        icon={<FileText className="size-5" />}
        actions={
          <>
            {currentUser?.role !== 'USER' ? (
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={loading || filteredExcuses.length === 0}
              >
                <Download className="mr-2 size-4" aria-hidden="true" />
                Unduh CSV
              </Button>
            ) : null}
            {currentUser?.role === 'USER' ? (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Pengajuan baru
              </Button>
            ) : null}
          </>
        }
      >
        {isError ? (
          <ErrorWithRetry title="Gagal memuat pengajuan izin" error={swr.error} onRetry={retry} />
        ) : showSlowLoadingHint ? (
          <SlowLoadingHint onRetry={retry} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div className="flex flex-col gap-5 border-b border-border p-5 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                <Input
                  type="text"
                  placeholder="Cari nama mahasiswa atau kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Menunggu</SelectItem>
                  <SelectItem value="APPROVED">Disetujui</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Semua Alasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Alasan</SelectItem>
                  <SelectItem value="SICK">Sakit</SelectItem>
                  <SelectItem value="EXCUSED">Izin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ul className="space-y-3 p-5 md:hidden" aria-label="Daftar pengajuan izin">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="rounded-2xl border border-border p-4 border-border">
                    <Skeleton className="mb-2 h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-3 h-9 w-full" />
                  </li>
                ))
              ) : filteredExcuses.length === 0 ? (
                <li>
                  <AdminEmptyState
                    compact
                    icon={FileTextIcon}
                    title={hasFilters ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
                    description={
                      hasFilters
                        ? 'Ubah filter atau kata kunci pencarian.'
                        : 'Pengajuan izin dan sakit akan muncul di sini.'
                    }
                  />
                </li>
              ) : (
                paginatedExcuses.map((excuse) => {
                  const proofHref = resolveProofUrl(excuse.proof_url);
                  const classLabel = (() => {
                    const labels = (excuse.session.session_classes ?? []).flatMap((x) => {
                      const result = formatClassLabel(x?.class);
                      return result ? [result] : [];
                    });
                    if (labels.length) return labels.join(', ');
                    return excuse.session.class ? formatClassLabel(excuse.session.class) : 'Umum';
                  })();
                  return (
                    <li
                      key={excuse.id}
                      className="rounded-2xl border border-border p-4 border-border"
                    >
                      {currentUser?.role !== 'USER' && (
                        <>
                          <p className="font-bold text-foreground">{excuse.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {excuse.user.nim_nip || '-'}
                          </p>
                        </>
                      )}
                      <p className="mt-1 text-sm font-medium text-brand">{excuse.session.title}</p>
                      <p className="text-xs font-semibold text-brand">{classLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(excuse.session.session_start), 'dd MMM yyyy HH:mm', {
                          locale: localeId,
                        })}
                      </p>
                      {excuse.description ? (
                        <p
                          className="mt-2 text-xs text-muted-foreground line-clamp-2"
                          title={excuse.description}
                        >
                          {excuse.description}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant={excuse.reason === 'SICK' ? 'destructive' : 'warning'}>
                          {excuse.reason === 'SICK' ? 'Sakit' : 'Izin'}
                        </Badge>
                        <Badge
                          variant={
                            excuse.status === 'APPROVED'
                              ? 'success'
                              : excuse.status === 'REJECTED'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {excuseStatusLabel(excuse.status)}
                        </Badge>
                      </div>
                      {excuse.reviewer ? (
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Oleh: {excuse.reviewer.name}
                        </p>
                      ) : null}
                      {proofHref ? (
                        <a
                          href={proofHref}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-brand text-brand"
                        >
                          <Download className="size-4" />
                          Lihat bukti
                        </a>
                      ) : null}
                      {currentUser?.role !== 'USER' && excuse.status === 'PENDING' ? (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11 flex-1 border-emerald-200 text-emerald-700"
                            disabled={!!reviewingId}
                            aria-busy={reviewingId === excuse.id}
                            onClick={() =>
                              openReviewConfirm(
                                excuse.id,
                                'APPROVED',
                                excuse.user?.name ?? 'Mahasiswa'
                              )
                            }
                          >
                            {reviewingId === excuse.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              'Terima'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11 flex-1 border-red-200 text-red-700"
                            disabled={!!reviewingId}
                            onClick={() =>
                              openReviewConfirm(
                                excuse.id,
                                'REJECTED',
                                excuse.user?.name ?? 'Mahasiswa'
                              )
                            }
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                  <TableRow>
                    {currentUser?.role !== 'USER' && <TableHead>Mahasiswa</TableHead>}
                    <TableHead>Kelas / Sesi</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead>Status</TableHead>
                    {currentUser?.role !== 'USER' && (
                      <TableHead className="text-right">Aksi</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={currentUser?.role !== 'USER' ? 6 : 5}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredExcuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={currentUser?.role !== 'USER' ? 6 : 5} className="p-0">
                        <AdminEmptyState
                          compact
                          icon={FileTextIcon}
                          title={hasFilters ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
                          description={
                            hasFilters
                              ? 'Ubah filter atau kata kunci pencarian.'
                              : 'Pengajuan izin dan sakit akan muncul di sini.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedExcuses.map((excuse) => (
                      <TableRow key={excuse.id}>
                        {currentUser?.role !== 'USER' && (
                          <TableCell>
                            <div className="font-medium text-foreground">{excuse.user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {excuse.user.nim_nip}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium text-slate-800 dark:text-zinc-200">
                            {excuse.session.title}
                          </div>
                          <div className="text-xs font-semibold text-brand text-brand mt-0.5">
                            {(() => {
                              const labels = (excuse.session.session_classes ?? []).flatMap(
                                (x: any) => {
                                  const result = formatClassLabel(x?.class);
                                  return result ? [result] : [];
                                }
                              );
                              if (labels.length) return labels.join(', ');
                              return excuse.session.class
                                ? formatClassLabel(excuse.session.class)
                                : 'Umum';
                            })()}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(excuse.session.session_start), 'dd MMM yyyy HH:mm', {
                              locale: localeId,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={excuse.reason === 'SICK' ? 'destructive' : 'warning'}>
                            {excuse.reason === 'SICK' ? 'Sakit' : 'Izin'}
                          </Badge>
                          <p
                            className="text-xs mt-1 max-w-xs truncate text-muted-foreground"
                            title={excuse.description}
                          >
                            {excuse.description || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {resolveProofUrl(excuse.proof_url) ? (
                            <a
                              href={resolveProofUrl(excuse.proof_url) || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand hover:underline flex items-center gap-1 text-sm"
                            >
                              <FileText size={14} /> Lihat Bukti
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              excuse.status === 'APPROVED'
                                ? 'success'
                                : excuse.status === 'REJECTED'
                                  ? 'destructive'
                                  : 'default'
                            }
                            className="gap-1"
                          >
                            {excuse.status === 'APPROVED' && <CheckCircle2 size={12} />}
                            {excuse.status === 'REJECTED' && <XCircle size={12} />}
                            {excuse.status === 'PENDING' && <Clock size={12} />}
                            {excuseStatusLabel(excuse.status)}
                          </Badge>
                          {excuse.reviewer && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Oleh: {excuse.reviewer.name}
                            </div>
                          )}
                        </TableCell>
                        {currentUser?.role !== 'USER' && (
                          <TableCell className="text-right">
                            {excuse.status === 'PENDING' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                  disabled={!!reviewingId}
                                  aria-busy={reviewingId === excuse.id}
                                  onClick={() =>
                                    openReviewConfirm(
                                      excuse.id,
                                      'APPROVED',
                                      excuse.user?.name ?? 'Mahasiswa'
                                    )
                                  }
                                >
                                  {reviewingId === excuse.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    'Terima'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={!!reviewingId}
                                  onClick={() =>
                                    openReviewConfirm(
                                      excuse.id,
                                      'REJECTED',
                                      excuse.user?.name ?? 'Mahasiswa'
                                    )
                                  }
                                >
                                  Tolak
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              meta={excusesPaginationMeta}
              onPageChange={setExcusesPage}
              itemLabel="pengajuan"
            />
          </div>
        )}

        {/* Modal Form */}
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            if (!open && submitting) return;
            if (!open) {
              stopCamera();
              clearPhoto();
            }
            setIsModalOpen(open);
          }}
        >
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto p-0">
            <div className="border-b border-border px-6 py-5 border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Buat Pengajuan Izin Baru
                </DialogTitle>
                <DialogDescription className="sr-only">Form pengajuan izin</DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              <FormField id="excuse-session" label="Pilih Sesi / Kelas" required>
                {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                  <Select
                    required
                    value={formData.session_id}
                    onValueChange={(val) => setFormData({ ...formData, session_id: val })}
                  >
                    <SelectTrigger
                      id={id}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <SelectValue placeholder="Pilih Sesi yang akan diizinkan" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title} (
                          {(() => {
                            const labels = (s.session_classes ?? []).flatMap((x: any) => {
                              const result = formatClassLabel(x?.class);
                              return result ? [result] : [];
                            });
                            if (labels.length) return labels.join(', ');
                            return s.class ? formatClassLabel(s.class) : 'Umum';
                          })()}
                          ) - {format(new Date(s.session_start), 'dd MMM', { locale: localeId })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField id="excuse-reason" label="Jenis Izin" required>
                {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                  <Select
                    required
                    value={formData.reason}
                    onValueChange={(val) => setFormData({ ...formData, reason: val })}
                  >
                    <SelectTrigger
                      id={id}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SICK">Sakit</SelectItem>
                      <SelectItem value="EXCUSED">Izin (Kegiatan/Lainnya)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField id="excuse-description" label="Keterangan" required>
                {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                  <Input
                    id={id}
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mohon sebutkan alasan izin/sakit..."
                    aria-describedby={ariaDescribedBy}
                    aria-invalid={ariaInvalid}
                  />
                )}
              </FormField>

              <FormField
                id="excuse-photo"
                label="Foto Bukti"
                required
                description="(wajib foto baru)"
                error={cameraError || undefined}
              >
                {({ 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                  <>
                    {!isCameraActive && !photoBlob ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11"
                          disabled={!formData.session_id || cameraStarting}
                          onClick={() => void startCamera()}
                        >
                          {cameraStarting ? 'Membuka kamera…' : 'Buka Kamera'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11"
                          disabled={!formData.session_id || cameraStarting}
                          onClick={switchCamera}
                        >
                          Ganti Kamera
                        </Button>
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        'space-y-3 rounded-xl border border-border bg-muted/10 p-3',
                        !isCameraActive && 'hidden'
                      )}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        className="aspect-video w-full rounded-lg bg-black object-cover pointer-events-none"
                        playsInline
                        muted
                        aria-hidden="true"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11"
                          onClick={switchCamera}
                        >
                          Ganti Kamera
                        </Button>
                        <Button type="button" className="min-h-11" onClick={takePhoto}>
                          Ambil Foto
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11"
                          onClick={stopCamera}
                        >
                          Tutup
                        </Button>
                      </div>
                      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                    </div>

                    {photoPreviewUrl ? (
                      <div
                        className="space-y-3 rounded-xl border border-border bg-muted/10 p-3"
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      >
                        <img
                          src={photoPreviewUrl}
                          alt="Pratinjau foto bukti"
                          className="mx-auto max-h-56 rounded-lg object-contain"
                        />
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            onClick={retakePhoto}
                          >
                            Foto Ulang
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-11"
                            onClick={clearPhoto}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </FormField>

              <DialogFooter className="mt-4 gap-4 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <SubmitButton
                  type="submit"
                  className="min-h-11"
                  isLoading={submitting}
                  label="Kirim Pengajuan"
                  loadingLabel="Mengirim…"
                />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          isOpen={Boolean(reviewConfirm)}
          onClose={() => setReviewConfirm(null)}
          onConfirm={() => void confirmReview()}
          title={
            reviewConfirm?.status === 'APPROVED'
              ? 'Setujui pengajuan izin?'
              : 'Tolak pengajuan izin?'
          }
          description={
            reviewConfirm
              ? `Pengajuan dari ${reviewConfirm.studentName} akan ${
                  reviewConfirm.status === 'APPROVED' ? 'disetujui' : 'ditolak'
                } dan status kehadiran disesuaikan.`
              : ''
          }
          confirmText={reviewConfirm?.status === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak'}
          variant={reviewConfirm?.status === 'REJECTED' ? 'danger' : 'primary'}
        />
      </AdminPageShell>
    </>
  );
}
