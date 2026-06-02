import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Smartphone,
  Camera,
  History as HistoryIcon,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import AdminPageShell from '@/components/AdminPageShell';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { CardSkeletonList } from '@/components/admin/CardSkeleton';
import type { AttendanceHistory } from '@/types/report';
import type { PaginationMeta } from '@/types/common';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { TablePagination } from '@/components/ui/TablePagination';
import { attendanceBadgeVariant, attendanceStatusLabel } from '@/lib/utils/statusLabel';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function HistoryPage() {
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const swr = useSWR(`/reports?page=${page}&limit=20`, fetcher, { revalidateOnFocus: false });
  const { isPending, isError, retry } = useSwrPageState(swr);
  const history: AttendanceHistory[] = Array.isArray(swr.data?.data) ? swr.data.data : [];
  const meta: PaginationMeta | null = swr.data?.meta ?? null;
  const hasFilters = filter !== 'ALL';

  const filteredHistory = history.filter((h) => {
    if (filter === 'ALL') return true;
    if (filter === 'EXCUSED') return h.status === 'SICK' || h.status === 'EXCUSED';
    return h.status === filter;
  });

  return (
    <AdminPageShell
      title="Riwayat Kehadiran"
      description="Pantau semua catatan absensimu sepanjang semester di sini."
      variant="plain"
      icon={<HistoryIcon className="size-5" />}
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', 'PRESENT', 'LATE', 'EXCUSED', 'ABSENT'].map((statusOption) => (
          <Button
            key={statusOption}
            variant={filter === statusOption ? 'default' : 'outline'}
            onClick={() => setFilter(statusOption)}
            className={`rounded-full ${filter === statusOption ? 'shadow-md shadow-indigo-500/30' : ''}`}
          >
            {statusOption === 'ALL'
              ? 'Semua Riwayat'
              : statusOption === 'PRESENT'
                ? 'Hadir Tepat Waktu'
                : statusOption === 'LATE'
                  ? 'Terlambat'
                  : statusOption === 'EXCUSED'
                    ? 'Sakit / Izin'
                    : 'Alfa'}
          </Button>
        ))}
      </div>

      {isError ? (
        <ErrorWithRetry
          title="Gagal memuat riwayat"
          error={swr.error ?? 'Permintaan membutuhkan waktu lebih lama dari biasanya.'}
          onRetry={retry}
        />
      ) : isPending ? (
        <>
          <div className="md:hidden">
            <CardSkeletonList count={4} />
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10 md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                  <TableRow>
                    <TableHead>Kelas / Sesi</TableHead>
                    <TableHead>Jadwal (Waktu Check-in)</TableHead>
                    <TableHead>Perangkat & IP</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton className="mb-2 h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="mb-2 h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="mb-2 h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-6 w-24 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : filteredHistory.length === 0 ? (
        <div className="px-1 py-2 md:px-0 md:py-0">
          <AdminEmptyState
            compact
            icon={HistoryIcon}
            hasFilters={hasFilters}
            title={hasFilters ? undefined : 'Belum Ada Riwayat'}
            description={hasFilters ? undefined : 'Kamu belum mengikuti sesi kelas apa pun.'}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10 md:bg-card max-md:border-0 max-md:bg-transparent max-md:shadow-none max-md:dark:ring-0">
          {/* [UX] #18 — kartu mobile */}
          <ul className="space-y-3 p-5 md:hidden" aria-label="Riwayat kehadiran">
            {filteredHistory.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-bold text-foreground">{item.session_title}</p>
                <p className="text-sm text-brand">{item.class_name || 'Umum'}</p>
                <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="shrink-0 text-indigo-500" aria-hidden="true" />
                    <span>
                      {format(new Date(item.session_date), 'dd MMM yyyy', { locale: id })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="shrink-0" aria-hidden="true" />
                    <span>{format(new Date(item.check_in_time), 'HH:mm:ss')} WIB</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={14} className="shrink-0" aria-hidden="true" />
                    <span className="truncate" title={item.device}>
                      {item.device || 'Perangkat tidak diketahui'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="shrink-0" aria-hidden="true" />
                    <span className="font-mono">{item.ip || 'N/A'}</span>
                  </div>
                  {item.photo_url ? (
                    <a
                      href={item.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand"
                    >
                      <Camera size={14} aria-hidden="true" /> Lihat bukti foto
                    </a>
                  ) : null}
                </div>
                <div className="mt-3 flex justify-end">
                  <Badge
                    variant={attendanceBadgeVariant(item.status)}
                    className="gap-1.5 px-3 py-1"
                  >
                    {item.status === 'PRESENT' && <CheckCircle2 className="size-3.5" />}
                    {item.status === 'LATE' && <Clock className="size-3.5" />}
                    {(item.status === 'SICK' || item.status === 'EXCUSED') && (
                      <FileText className="size-3.5" />
                    )}
                    {item.status === 'ABSENT' && <XCircle className="size-3.5" />}
                    {attendanceStatusLabel(item.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                  <TableRow>
                    <TableHead>Kelas / Sesi</TableHead>
                    <TableHead>Jadwal (Waktu Check-in)</TableHead>
                    <TableHead>Perangkat & IP</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-bold text-foreground text-base">
                          {item.session_title}
                        </div>
                        {item.class_name && (
                          <p className="text-sm font-semibold text-brand text-brand mt-0.5">
                            {typeof item.class_name === 'object' && item.class_name !== null
                              ? (item.class_name as any).name || (item.class_name as any).id
                              : item.class_name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-500" />
                            <span className="font-medium">
                              {format(new Date(item.session_date), 'dd MMM yyyy', { locale: id })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock size={14} />
                            {format(new Date(item.check_in_time), 'HH:mm:ss')} WIB
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Smartphone size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]" title={item.device}>
                              {item.device || 'Perangkat tidak diketahui'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="font-mono">{item.ip || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.photo_url ? (
                          <a
                            href={item.photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand hover:text-indigo-700 hover:underline flex items-center gap-1.5 text-sm font-medium"
                          >
                            <Camera size={14} /> Lihat Foto
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-600 text-sm italic">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={attendanceBadgeVariant(item.status)}
                          className="gap-1.5 px-3 py-1"
                        >
                          {item.status === 'PRESENT' && <CheckCircle2 className="size-3.5" />}
                          {item.status === 'LATE' && <Clock className="size-3.5" />}
                          {(item.status === 'SICK' || item.status === 'EXCUSED') && (
                            <FileText className="size-3.5" />
                          )}
                          {item.status === 'ABSENT' && <XCircle className="size-3.5" />}
                          {attendanceStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          {meta ? <TablePagination meta={meta} onPageChange={setPage} itemLabel="riwayat" /> : null}
        </div>
      )}
    </AdminPageShell>
  );
}
