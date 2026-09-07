import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Search, Edit2, Trash2, X, QrCode, MapPin, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { useMutationToast } from '@/hooks/useMutationToast';
import { sessionStatusLabel } from '@/lib/utils/statusLabel';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmModal } from '@/components/ConfirmModal';
import ActionLoadingOverlay from '@/components/ActionLoadingOverlay';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminPageShell from '@/components/AdminPageShell';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { CardSkeletonList } from '@/components/admin/CardSkeleton';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';

import type { Location, Session } from '@/types/session';
import { formatClassLabel, sessionClassNames } from '@/lib/utils/classLabel';
import { WizardStepIndicator } from '@/components/ui/WizardStepIndicator';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import { TablePagination } from '@/components/ui/TablePagination';
import { applyApiFieldErrors, firstFieldErrorMessage } from '@/lib/http/apiFieldErrors';
import { LastSavedIndicator } from '@/components/admin/LastSavedIndicator';
import { cn } from '@/lib/utils/utils';

const WIZARD_LABELS = ['Info & Lokasi', 'Jadwal', 'Aturan Absen', 'Kelas'] as const;
const WIZARD_HINTS = [
  'Nama sesi, lokasi geofencing, dan cara validasi absensi (QR atau GPS saja).',
  'Waktu mulai–selesai sesi serta kapan mahasiswa boleh membuka check-in.',
  'Batas menit dianggap terlambat dan apakah wajib check-out setelah hadir.',
  'Kelas yang diundang; kosongkan pilihan kelas jika sesi untuk semua mahasiswa.',
] as const;

type FormFieldKey =
  | 'title'
  | 'description'
  | 'location_id'
  | 'qr_mode'
  | 'session_start'
  | 'session_end'
  | 'check_in_open_at'
  | 'check_in_close_at'
  | 'late_threshold_minutes'
  | 'status'
  | 'class_ids';

type FormFieldErrors = Partial<Record<FormFieldKey, string>>;

function qrModeLabel(mode: string): string {
  if (mode === 'NONE') return 'Tanpa QR (GPS saja)';
  if (mode === 'DYNAMIC') return 'QR Dinamis';
  if (mode === 'STATIC') return 'QR Statis';
  return mode;
}

function sessionStatusBadgeVariant(status: string): 'success' | 'outline' | 'secondary' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'UPCOMING') return 'outline';
  return 'secondary';
}

export default function Sessions() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [wizardStep, setWizardStep] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; semester: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [classSearch, setClassSearch] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_id: '',
    class_ids: [] as string[],
    qr_mode: 'NONE',
    session_start: '',
    session_end: '',
    check_in_open_at: '',
    check_in_close_at: '',
    late_threshold_minutes: 15,
    require_checkout: false,
    status: 'UPCOMING',
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormFieldErrors>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [formBaseline, setFormBaseline] = useState<string>('');

  // Delete Session Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  // Nilai minimum untuk input datetime-local (waktu sekarang dalam zona lokal)
  // Sengaja hitung sekali per render — memo tidak perlu karena cheap & tidak harus update tiap detik.
  const nowLocalMin = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const swr = useSWR<Session[]>('/sessions', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const {
    data: sessions = [],
    isPending,
    isError,
    retry,
    mutate,
    showSlowLoadingHint,
  } = useSwrPageState(swr);

  const doSaveSession = useMutationToast(
    async () => {
      const payload = buildSessionPayload();
      if (editingSession) {
        const res = await api.put(`/sessions/${editingSession.id}`, payload);
        if (res.data?.success === false) {
          throw new Error(res.data?.message || res.data?.error || 'Gagal memperbarui sesi');
        }
        return res.data;
      }
      const res = await api.post('/sessions', payload);
      if (res.data?.success === false) {
        throw new Error(res.data?.message || res.data?.error || 'Gagal membuat sesi');
      }
      return res.data;
    },
    {
      successMsg: editingSession ? 'Sesi berhasil diperbarui' : 'Sesi berhasil dibuat',
      errorMsg: (err: unknown) => {
        const fieldErrors = applyApiFieldErrors(err, setFormErrors);
        if (fieldErrors) {
          focusWizardStepForErrors(fieldErrors);
          return (
            firstFieldErrorMessage(fieldErrors) ?? toastErrorMessage(err, 'Gagal menyimpan sesi')
          );
        }
        return toastErrorMessage(err, 'Gagal menyimpan sesi');
      },
      onSuccess: () => setLastSavedAt(new Date()),
    }
  );

  const doDeleteSession = useMutationToast(() => api.delete(`/sessions/${sessionToDelete}`), {
    successMsg: 'Sesi berhasil dihapus',
    errorMsg: (err) => toastErrorMessage(err, 'Gagal menghapus sesi'),
  });

  const hasFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(filterDate) ||
    filterLocation !== 'ALL' ||
    filterClass !== 'ALL';

  const canProceedWizard = (step: number) => {
    if (step === 1) return Boolean(formData.title.trim() && formData.location_id);
    if (step === 2) return Boolean(formData.session_start && formData.session_end);
    if (step === 3) return Boolean(formData.check_in_open_at && formData.check_in_close_at);
    return true;
  };

  const fetchLocations = async () => {
    try {
      const [locationsRes, classesRes] = await Promise.all([
        api.get('/locations'),
        api.get('/classes'),
      ]);
      setLocations(locationsRes.data.data);
      setClasses(classesRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== 'USER') {
      fetchLocations();
    }
  }, [currentUser]);

  // Format UTC date string to local datetime-local string
  const formatForDateTimeLocal = (dateString: string) => {
    const d = new Date(dateString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleOpenModal = (session: any = null) => {
    if (session) {
      setEditingSession(session);
      const linkedIds = Array.isArray(session.session_classes)
        ? session.session_classes.flatMap((x: any) => {
            const result = x?.class?.id;
            return result ? [result] : [];
          })
        : [];
      const classIds = linkedIds.length ? linkedIds : session.class_id ? [session.class_id] : [];
      const initial = {
        title: session.title,
        description: session.description || '',
        class_ids: classIds,
        location_id: session.location_id,
        qr_mode: session.qr_mode,
        session_start: formatForDateTimeLocal(session.session_start),
        session_end: formatForDateTimeLocal(session.session_end),
        check_in_open_at: formatForDateTimeLocal(session.check_in_open_at),
        check_in_close_at: formatForDateTimeLocal(session.check_in_close_at),
        late_threshold_minutes: session.late_threshold_minutes,
        require_checkout: session.require_checkout,
        status: session.status,
      };
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    } else {
      setEditingSession(null);

      // Default to today + 1 hour
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const nowStr = now.toISOString().slice(0, 16);

      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const laterStr = later.toISOString().slice(0, 16);

      const initial = {
        title: '',
        description: '',
        location_id: locations.length > 0 ? locations[0].id : '',
        class_ids: [] as string[],
        qr_mode: 'NONE',
        session_start: nowStr,
        session_end: laterStr,
        check_in_open_at: nowStr,
        check_in_close_at: laterStr,
        late_threshold_minutes: 15,
        require_checkout: false,
        status: 'UPCOMING',
      };
      setFormData(initial);
      setFormBaseline(JSON.stringify(initial));
    }
    setLastSavedAt(null);
    setWizardStep(1);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const onWizardFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep < 4 && canProceedWizard(wizardStep)) {
      setWizardStep((s) => Math.min(4, s + 1));
    }
  };

  const validateSessionForm = (): Record<string, string> => {
    const openAtMs = new Date(formData.check_in_open_at).getTime();
    const closeAtMs = new Date(formData.check_in_close_at).getTime();
    const sessionStartMs = new Date(formData.session_start).getTime();
    const sessionEndMs = new Date(formData.session_end).getTime();
    const nowMs = Date.now();
    const isEditOngoing = Boolean(editingSession) && editingSession?.status !== 'UPCOMING';

    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = 'Judul sesi wajib diisi.';
    }
    if (!formData.location_id) {
      errors.location_id = 'Pilih lokasi sesi.';
    }
    if (Number.isNaN(closeAtMs) || Number.isNaN(openAtMs)) {
      errors.check_in_close_at = 'Format waktu tidak valid.';
    } else {
      if (!isEditOngoing && closeAtMs <= nowMs + 60_000) {
        errors.check_in_close_at = 'Tutup absen harus minimal 1 menit ke depan dari sekarang.';
      }
      if (closeAtMs <= openAtMs) {
        errors.check_in_close_at = 'Tutup absen harus setelah Buka absen.';
      }
      if (!Number.isNaN(sessionEndMs) && sessionEndMs < sessionStartMs) {
        errors.session_end = 'Berakhir sesi tidak boleh sebelum mulai sesi.';
      }
    }
    return errors;
  };

  const focusWizardStepForErrors = (errors: Record<string, string>) => {
    if (errors.title || errors.location_id || errors.qr_mode) {
      setWizardStep(1);
    } else if (errors.session_start || errors.session_end) {
      setWizardStep(2);
    } else if (
      errors.check_in_open_at ||
      errors.check_in_close_at ||
      errors.late_threshold_minutes
    ) {
      setWizardStep(3);
    } else if (errors.class_ids) {
      setWizardStep(4);
    }
  };

  const buildSessionPayload = () => {
    const base = {
      title: formData.title.trim(),
      description: formData.description || undefined,
      location_id: formData.location_id,
      qr_mode: formData.qr_mode,
      session_start: new Date(formData.session_start).toISOString(),
      session_end: new Date(formData.session_end).toISOString(),
      check_in_open_at: new Date(formData.check_in_open_at).toISOString(),
      check_in_close_at: new Date(formData.check_in_close_at).toISOString(),
      late_threshold_minutes: Number(formData.late_threshold_minutes),
      require_checkout: formData.require_checkout,
      class_ids: formData.class_ids,
    };
    if (editingSession) {
      return { ...base, status: formData.status };
    }
    return base;
  };

  const openSaveConfirm = () => {
    const errors = validateSessionForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      focusWizardStepForErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    setIsSaveConfirmOpen(true);
  };

  const saveSession = async () => {
    if (saving) return;
    setSaving(true);
    setFormErrors({});

    try {
      const errors = validateSessionForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        focusWizardStepForErrors(errors);
        toast.error(Object.values(errors)[0]);
        setIsSaveConfirmOpen(false);
        return;
      }

      const result = await doSaveSession();
      if (result !== undefined) {
        setIsSaveConfirmOpen(false);
        setIsModalOpen(false);
        await mutate();
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: FormFieldKey) =>
    formErrors[key] ? <p className="text-sm text-destructive">{formErrors[key]}</p> : null;

  const clearFieldError = (key: FormFieldKey) => {
    if (!formErrors[key]) return;
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const openDeleteConfirm = (id: string) => {
    setSessionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || deleting) return;
    setDeleting(true);
    try {
      const result = await doDeleteSession();
      if (result !== undefined) {
        setIsDeleteModalOpen(false);
        setSessionToDelete(null);
        mutate();
      }
    } finally {
      setDeleting(false);
    }
  };

  const selectedClassIdSet = useMemo(() => new Set(formData.class_ids), [formData.class_ids]);
  const classByIdMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; semester: number }>();
    for (const c of classes) m.set(c.id, c);
    return m;
  }, [classes]);

  const filteredSessions = sessions.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLocation = filterLocation === 'ALL' || s.location?.id === filterLocation;
    const linkedIds = (s.session_classes ?? []).flatMap((x) => {
      const result = x?.class?.id;
      return result ? [result] : [];
    }) as string[];
    const legacyClassId = s.class_id ?? null;
    const isAllStudents = !legacyClassId && linkedIds.length === 0;
    const linkedIdSet = new Set(linkedIds);
    const matchClass =
      filterClass === 'ALL' ||
      (filterClass === 'ALL_STUDENTS'
        ? isAllStudents
        : legacyClassId === filterClass || linkedIdSet.has(filterClass));

    let matchDate = true;
    if (filterDate) {
      const sDate = new Date(s.session_start).toISOString().split('T')[0];
      matchDate = sDate === filterDate;
    }

    return matchSearch && matchLocation && matchClass && matchDate;
  });

  const {
    paginatedItems: paginatedSessions,
    meta: sessionsPaginationMeta,
    setPage: setSessionsPage,
  } = useClientPagination(filteredSessions, {
    pageSize: 20,
    resetDeps: [searchTerm, filterDate, filterLocation, filterClass],
  });

  const formIsDirty = JSON.stringify(formData) !== formBaseline;

  const actionOverlayLabel = saving
    ? editingSession
      ? 'Menyimpan perubahan sesi…'
      : 'Membuat sesi…'
    : deleting
      ? 'Menghapus sesi…'
      : null;

  return (
    <>
      <ActionLoadingOverlay show={!!actionOverlayLabel} label={actionOverlayLabel ?? ''} />
      <AdminPageShell
        title="Sesi Kehadiran"
        description="Kelola sesi, jadwal, lokasi, dan QR."
        variant="plain"
        icon={<Calendar className="size-5" />}
        actions={
          currentUser?.role !== 'USER' ? (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="size-4 mr-2" />
              Buat Sesi Baru
            </Button>
          ) : null
        }
      >
        {isError ? (
          <ErrorWithRetry
            title="Gagal memuat sesi"
            error={swr.error}
            onRetry={retry}
            className="mb-6"
          />
        ) : showSlowLoadingHint ? (
          <SlowLoadingHint onRetry={retry} />
        ) : (
          <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div className="grid grid-cols-1 gap-5 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                <Input
                  type="text"
                  placeholder="Cari kegiatan/mata kuliah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                  aria-label="Cari sesi absensi"
                />
              </div>
              <div className="relative w-full">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4 z-10 pointer-events-none" />
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-9 block appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer bg-transparent"
                  aria-label="Filter tanggal sesi"
                />
              </div>
              <div className="w-full">
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger className="w-full" aria-label="Filter lokasi sesi">
                    <SelectValue placeholder="Semua Lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Lokasi</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full">
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    <SelectItem value="ALL_STUDENTS">Semua Mahasiswa (Umum)</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {formatClassLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ul className="space-y-3 p-5 md:hidden" aria-label="Daftar sesi">
              {isPending ? (
                <li>
                  <CardSkeletonList count={3} />
                </li>
              ) : filteredSessions.length === 0 ? (
                <li>
                  <AdminEmptyState
                    compact
                    icon={Calendar}
                    hasFilters={hasFilters}
                    title={hasFilters ? 'Tidak ada hasil' : 'Belum ada sesi'}
                    description={
                      hasFilters
                        ? 'Ubah filter pencarian, tanggal, lokasi, atau kelas.'
                        : 'Buat sesi kehadiran untuk memulai absensi.'
                    }
                  />
                </li>
              ) : (
                paginatedSessions.map((session) => {
                  const attendances = (
                    session as Session & {
                      attendances?: { id: string; check_out_time: string | null }[];
                    }
                  ).attendances;
                  return (
                    <li
                      key={session.id}
                      className="rounded-2xl border border-border bg-background/60 p-4 dark:bg-muted/10"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-base font-bold leading-snug text-foreground">
                            {session.title}
                          </p>
                          <Badge
                            variant={sessionStatusBadgeVariant(session.status)}
                            className="justify-center text-center whitespace-normal"
                          >
                            {sessionStatusLabel(session.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{session.location?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.session_start), 'dd MMM yyyy · HH:mm', {
                            locale: id,
                          })}{' '}
                          – {format(new Date(session.session_end), 'HH:mm')} WIB
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sessionClassNames(session)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {qrModeLabel(session.qr_mode)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dibuat oleh: {session.creator?.name}
                        </p>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        {session.qr_mode !== 'NONE' && session.status !== 'CLOSED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => window.open(`/sessions/${session.id}/qr`, '_blank')}
                            aria-label={`Tampilkan QR untuk ${session.title}`}
                          >
                            QR
                          </Button>
                        )}
                        {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-11"
                              onClick={() => handleOpenModal(session)}
                              aria-label={`Edit sesi ${session.title}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="min-h-11"
                              onClick={() => openDeleteConfirm(session.id)}
                              aria-label={`Hapus sesi ${session.title}`}
                            >
                              Hapus
                            </Button>
                          </>
                        )}
                        {currentUser?.role === 'USER' && session.status === 'ACTIVE' && (
                          <>
                            {attendances && attendances.length > 0 ? (
                              attendances[0].check_out_time || !session.require_checkout ? (
                                <Badge variant="success" className="min-h-11 px-3 py-2">
                                  Sudah Absen
                                </Badge>
                              ) : (
                                <Button
                                  className="min-h-11 flex-1 bg-amber-500 hover:bg-amber-600"
                                  onClick={() =>
                                    navigate(
                                      `/attend?session=${session.id}&checkout=true&attendance=${attendances[0].id}`
                                    )
                                  }
                                >
                                  Check-out
                                </Button>
                              )
                            ) : (
                              <Button
                                className="min-h-11 flex-1"
                                onClick={() => navigate(`/attend?session=${session.id}`)}
                              >
                                Hadir
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                  <TableRow>
                    <TableHead>Informasi Kelas/Event</TableHead>
                    <TableHead>Jadwal Sesi</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mode QR & Lokasi</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Skeleton className="h-5 w-40 mb-2" />
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Skeleton className="mx-auto h-5 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="size-8 rounded-md" />
                            <Skeleton className="size-8 rounded-md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <AdminEmptyState
                          compact
                          icon={Calendar}
                          hasFilters={hasFilters}
                          title={hasFilters ? 'Tidak ada hasil' : 'Belum ada sesi'}
                          description={
                            hasFilters
                              ? 'Ubah filter pencarian, tanggal, lokasi, atau kelas.'
                              : 'Buat sesi kehadiran untuk memulai absensi.'
                          }
                          className="border-0 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="font-bold text-foreground text-base">{session.title}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin size={14} className="text-indigo-500" />
                            {session.location?.name}
                          </div>
                          <div className="text-xs text-slate-400 text-muted-foreground mt-1">
                            Dibuat oleh: {session.creator?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <Clock size={14} className="text-indigo-500" />
                            <span className="font-medium">
                              {format(new Date(session.session_start), 'dd MMM yyyy', {
                                locale: id,
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(session.session_start), 'HH:mm')} -{' '}
                            {format(new Date(session.session_end), 'HH:mm')} WIB
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-muted-foreground">
                            {sessionClassNames(session)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin size={14} className="text-emerald-500 shrink-0" />
                              <span className="font-medium text-sm line-clamp-1">
                                {session.location?.name || 'Lokasi tidak diketahui'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <QrCode size={14} className="text-slate-400" />
                              <span className="font-medium">{qrModeLabel(session.qr_mode)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={sessionStatusBadgeVariant(session.status)}
                            className="justify-center text-center whitespace-normal"
                          >
                            {sessionStatusLabel(session.status)}
                          </Badge>
                        </TableCell>
                        {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {session.qr_mode !== 'NONE' && session.status !== 'CLOSED' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    window.open(`/sessions/${session.id}/qr`, '_blank')
                                  }
                                  className="text-brand hover:text-indigo-700 hover:bg-indigo-50 text-brand dark:hover:bg-indigo-900/50"
                                  aria-label={`Tampilkan QR untuk ${session.title}`}
                                >
                                  <QrCode className="size-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(session)}
                                className="text-muted-foreground hover:text-brand hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/30"
                                aria-label={`Edit sesi ${session.title}`}
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteConfirm(session.id)}
                                className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/30"
                                aria-label={`Hapus sesi ${session.title}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        {currentUser?.role === 'USER' && (
                          <TableCell className="text-right">
                            {session.status === 'ACTIVE' && (
                              <div className="flex gap-2 justify-end">
                                {(session as any).attendances &&
                                (session as any).attendances.length > 0 ? (
                                  (session as any).attendances[0].check_out_time ||
                                  !session.require_checkout ? (
                                    <Badge variant="success">Sudah Absen</Badge>
                                  ) : (
                                    <Button
                                      onClick={() =>
                                        navigate(
                                          `/attend?session=${session.id}&checkout=true&attendance=${(session as any).attendances[0].id}`
                                        )
                                      }
                                      className="shadow-lg shadow-amber-600/20 bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 h-auto"
                                    >
                                      Check-out
                                    </Button>
                                  )
                                ) : (
                                  <Button
                                    onClick={() => navigate(`/attend?session=${session.id}`)}
                                    className="min-h-11 shadow-sm"
                                  >
                                    Hadir
                                  </Button>
                                )}
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
              meta={sessionsPaginationMeta}
              onPageChange={setSessionsPage}
              itemLabel="sesi"
            />
          </div>
        )}

        <Dialog
          open={Boolean(isModalOpen && currentUser?.role !== 'USER')}
          onOpenChange={setIsModalOpen}
        >
          <DialogContent className="max-w-4xl p-0">
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingSession ? 'Edit Sesi Kehadiran' : 'Buat Sesi Baru'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Form sesi kehadiran</DialogDescription>
                </DialogHeader>
                <LastSavedIndicator
                  lastSavedAt={lastSavedAt}
                  isDirty={formIsDirty}
                  isSaving={saving}
                />
              </div>
            </div>

            <form
              onSubmit={onWizardFormSubmit}
              className="max-h-[75vh] space-y-6 overflow-y-auto p-6"
            >
              <WizardStepIndicator
                labels={WIZARD_LABELS}
                hints={WIZARD_HINTS}
                currentStep={wizardStep}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <AdminContentTransition contentKey={String(wizardStep)} className="md:col-span-2">
                  {wizardStep === 1 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        id="session-title"
                        label="Judul / Mata Kuliah"
                        required
                        error={formErrors.title}
                      >
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => {
                              clearFieldError('title');
                              setFormData({ ...formData, title: e.target.value });
                            }}
                            placeholder="Pemrograman Web Lanjut (A)"
                          />
                        )}
                      </FormField>
                      <FormField
                        id="session-location"
                        label="Lokasi Ruangan"
                        required
                        error={formErrors.location_id}
                      >
                        {(fieldProps) => (
                          <Select
                            required
                            value={formData.location_id}
                            onValueChange={(value) => {
                              clearFieldError('location_id');
                              setFormData({ ...formData, location_id: value });
                            }}
                          >
                            <SelectTrigger
                              className="w-full"
                              id={fieldProps.id}
                              aria-describedby={fieldProps['aria-describedby']}
                              aria-invalid={fieldProps['aria-invalid']}
                            >
                              <SelectValue placeholder="Pilih Lokasi Geofencing..." />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </FormField>
                      <FormField
                        id="session-description"
                        label="Deskripsi"
                        error={formErrors.description}
                      >
                        {(fieldProps) => (
                          <Textarea
                            {...fieldProps}
                            rows={3}
                            value={formData.description}
                            onChange={(e) => {
                              clearFieldError('description');
                              setFormData({ ...formData, description: e.target.value });
                            }}
                          />
                        )}
                      </FormField>
                      <FormField
                        id="session-qr-mode"
                        label="Metode Validasi QR"
                        required
                        error={formErrors.qr_mode}
                      >
                        {(fieldProps) => (
                          <Select
                            required
                            value={formData.qr_mode}
                            onValueChange={(value: string) => {
                              clearFieldError('qr_mode');
                              setFormData({ ...formData, qr_mode: value });
                            }}
                          >
                            <SelectTrigger
                              className="w-full"
                              id={fieldProps.id}
                              aria-describedby={fieldProps['aria-describedby']}
                              aria-invalid={fieldProps['aria-invalid']}
                            >
                              <SelectValue placeholder="Pilih Metode Validasi QR" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DYNAMIC">
                                QR Dinamis (ganti tiap 15 detik)
                              </SelectItem>
                              <SelectItem value="STATIC">QR Statis</SelectItem>
                              <SelectItem value="NONE">Tanpa QR (GPS saja)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </FormField>
                    </div>
                  ) : wizardStep === 2 ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <FormField
                          id="session-start"
                          label="Waktu Mulai Sesi"
                          required
                          error={formErrors.session_start}
                          className="min-w-0 flex-1"
                        >
                          {(fieldProps) => (
                            <Input
                              {...fieldProps}
                              type="datetime-local"
                              required
                              value={formData.session_start}
                              onChange={(e) => {
                                clearFieldError('session_start');
                                setFormData({ ...formData, session_start: e.target.value });
                              }}
                            />
                          )}
                        </FormField>
                        <span
                          className="hidden shrink-0 px-1 pb-2 text-muted-foreground sm:inline"
                          aria-hidden="true"
                        >
                          –
                        </span>
                        <FormField
                          id="session-end"
                          label="Waktu Selesai Sesi"
                          required
                          error={formErrors.session_end}
                          className="min-w-0 flex-1"
                        >
                          {(fieldProps) => (
                            <Input
                              {...fieldProps}
                              type="datetime-local"
                              required
                              value={formData.session_end}
                              onChange={(e) => {
                                clearFieldError('session_end');
                                setFormData({ ...formData, session_end: e.target.value });
                              }}
                            />
                          )}
                        </FormField>
                      </div>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <FormField
                          id="session-check-in-open"
                          label="Buka Check-in"
                          required
                          error={formErrors.check_in_open_at}
                          className="min-w-0 flex-1"
                        >
                          {(fieldProps) => (
                            <Input
                              {...fieldProps}
                              type="datetime-local"
                              required
                              min={editingSession ? undefined : nowLocalMin}
                              value={formData.check_in_open_at}
                              onChange={(e) => {
                                clearFieldError('check_in_open_at');
                                setFormData({ ...formData, check_in_open_at: e.target.value });
                              }}
                            />
                          )}
                        </FormField>
                        <span
                          className="hidden shrink-0 px-1 pb-2 text-muted-foreground sm:inline"
                          aria-hidden="true"
                        >
                          –
                        </span>
                        <FormField
                          id="session-check-in-close"
                          label="Tutup Check-in"
                          required
                          error={formErrors.check_in_close_at}
                          className="min-w-0 flex-1"
                        >
                          {(fieldProps) => (
                            <Input
                              {...fieldProps}
                              type="datetime-local"
                              required
                              min={editingSession ? undefined : nowLocalMin}
                              value={formData.check_in_close_at}
                              onChange={(e) => {
                                clearFieldError('check_in_close_at');
                                setFormData({ ...formData, check_in_close_at: e.target.value });
                              }}
                            />
                          )}
                        </FormField>
                      </div>
                    </div>
                  ) : wizardStep === 3 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          id="session-late-threshold"
                          label="Toleransi Terlambat (Menit)"
                          required
                          error={formErrors.late_threshold_minutes}
                        >
                          {(fieldProps) => (
                            <Input
                              {...fieldProps}
                              type="number"
                              min="0"
                              required
                              value={formData.late_threshold_minutes}
                              onChange={(e) => {
                                clearFieldError('late_threshold_minutes');
                                setFormData({
                                  ...formData,
                                  late_threshold_minutes: parseInt(e.target.value, 10) || 0,
                                });
                              }}
                            />
                          )}
                        </FormField>
                        <div className="flex items-center gap-2 pt-8">
                          <Checkbox
                            checked={Boolean(formData.require_checkout)}
                            onCheckedChange={(checked) =>
                              setFormData((p) => ({ ...p, require_checkout: Boolean(checked) }))
                            }
                          />
                          <span className="text-sm font-medium text-muted-foreground">
                            Wajib Check-out
                          </span>
                        </div>
                      </div>
                      {editingSession && (
                        <FormField
                          id="session-status"
                          label="Status Sesi (Override Manual)"
                          error={formErrors.status}
                        >
                          {(fieldProps) => (
                            <Select
                              value={formData.status}
                              onValueChange={(value: string) => {
                                clearFieldError('status');
                                setFormData({ ...formData, status: value });
                              }}
                            >
                              <SelectTrigger className="w-full" id={fieldProps.id}>
                                <SelectValue placeholder="Pilih Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UPCOMING">
                                  {sessionStatusLabel('UPCOMING')}
                                </SelectItem>
                                <SelectItem value="ACTIVE">
                                  {sessionStatusLabel('ACTIVE')}
                                </SelectItem>
                                <SelectItem value="CLOSED">
                                  {sessionStatusLabel('CLOSED')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </FormField>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FormField
                        id="session-class-target"
                        label="Target Kelas"
                        description="Kosong = semua mahasiswa."
                      >
                        {() => (
                          <>
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                value={classSearch}
                                onChange={(e) => setClassSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.preventDefault();
                                }}
                                placeholder="Cari kelas..."
                                className="pl-9"
                              />
                            </div>

                            <div className="scrollbar-hide max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-2">
                              <div className="space-y-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className={[
                                    'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                                    formData.class_ids.length === 0
                                      ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/30'
                                      : 'hover:bg-slate-50 dark:hover:bg-zinc-900',
                                  ].join(' ')}
                                  onClick={() => setFormData((p) => ({ ...p, class_ids: [] }))}
                                >
                                  <span className="font-medium">Semua Mahasiswa (Umum)</span>
                                  {formData.class_ids.length === 0 ? (
                                    <span className="text-xs font-semibold">Terpilih</span>
                                  ) : null}
                                </Button>
                                <div className="h-px bg-muted/70" />
                                {classes
                                  .filter((c) =>
                                    c.name.toLowerCase().includes(classSearch.trim().toLowerCase())
                                  )
                                  .map((c) => {
                                    const selected = selectedClassIdSet.has(c.id);
                                    return (
                                      <Button
                                        key={c.id}
                                        type="button"
                                        variant="ghost"
                                        className={[
                                          'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                                          selected
                                            ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/30'
                                            : 'hover:bg-slate-50 dark:hover:bg-zinc-900',
                                        ].join(' ')}
                                        onClick={() => {
                                          setFormData((p) => {
                                            const set = new Set(p.class_ids);
                                            if (selected) set.delete(c.id);
                                            else set.add(c.id);
                                            return { ...p, class_ids: Array.from(set) };
                                          });
                                        }}
                                      >
                                        <span className="font-medium">{formatClassLabel(c)}</span>
                                        {selected ? (
                                          <span className="text-xs font-semibold">Terpilih</span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">
                                            Tambah
                                          </span>
                                        )}
                                      </Button>
                                    );
                                  })}
                              </div>
                              {classes.filter((c) =>
                                c.name.toLowerCase().includes(classSearch.trim().toLowerCase())
                              ).length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  Tidak ada kelas.
                                </div>
                              ) : null}
                            </div>

                            <div className="rounded-xl border border-border bg-muted/30 p-3">
                              <div className="text-sm font-semibold text-foreground">
                                Kelas Terpilih:
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {formData.class_ids.length === 0 ? (
                                  <Badge variant="secondary">Semua Mahasiswa</Badge>
                                ) : (
                                  formData.class_ids
                                    .flatMap((id) => {
                                      const result = classByIdMap.get(id);
                                      return result ? [result] : [];
                                    })
                                    .map((c: any) => (
                                      <Badge key={c.id} variant="secondary" className="gap-1">
                                        <span className="max-w-[260px] truncate">
                                          {formatClassLabel(c)}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="ml-1 size-5"
                                          onClick={() =>
                                            setFormData((p) => ({
                                              ...p,
                                              class_ids: p.class_ids.filter((x) => x !== c.id),
                                            }))
                                          }
                                          aria-label="Hapus kelas"
                                        >
                                          <X className="size-3" />
                                        </Button>
                                      </Badge>
                                    ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </FormField>
                      {formErrors.class_ids ? (
                        <p className="pt-1 text-sm text-destructive">{formErrors.class_ids}</p>
                      ) : null}
                    </div>
                  )}
                </AdminContentTransition>
              </div>

              <DialogFooter className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="min-h-11"
                >
                  Batal
                </Button>
                {wizardStep > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                  >
                    Sebelumnya
                  </Button>
                ) : null}
                {wizardStep < 4 ? (
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={!canProceedWizard(wizardStep)}
                    onClick={() => setWizardStep((s) => Math.min(4, s + 1))}
                  >
                    Lanjut
                  </Button>
                ) : (
                  <SubmitButton
                    type="button"
                    disabled={saving}
                    className={cn(
                      'min-h-11',
                      formIsDirty
                        ? 'ring-2 ring-offset-2 ring-sky-500/70 focus-visible:outline-none dark:ring-offset-slate-900'
                        : undefined
                    )}
                    onClick={openSaveConfirm}
                    isLoading={saving}
                    label={editingSession ? 'Simpan Perubahan' : 'Buat Sesi'}
                    loadingLabel="Menyimpan…"
                  />
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          isOpen={isSaveConfirmOpen}
          onClose={() => !saving && setIsSaveConfirmOpen(false)}
          onConfirm={saveSession}
          title={editingSession ? 'Simpan perubahan sesi?' : 'Buat sesi baru?'}
          description={
            editingSession
              ? `Perubahan pada "${formData.title || editingSession.title}" akan disimpan ke sistem.`
              : `Sesi "${formData.title || 'tanpa judul'}" akan dibuat. Pastikan jadwal dan kelas sudah benar.`
          }
          confirmText={editingSession ? 'Ya, Simpan' : 'Ya, Buat Sesi'}
          variant="primary"
          loading={saving}
          loadingText="Menyimpan…"
        />

        {/* Delete Session Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteSession}
          title="Konfirmasi Hapus Sesi"
          description="Apakah Anda yakin ingin menghapus sesi absensi ini? Seluruh data yang terkait dengan sesi ini akan ikut terhapus."
          confirmText="Ya, Hapus Sesi"
          variant="danger"
          loading={deleting}
          loadingText="Menghapus…"
        />
      </AdminPageShell>
    </>
  );
}
