import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { FileText, Search, UserCircle2 } from 'lucide-react';
import api from '@/services/api';
import AdminPageShell from '@/components/AdminPageShell';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import type { Report } from '@/types/report';
import type { PaginationMeta } from '@/types/common';
import { attendanceBadgeVariant, attendanceStatusLabel } from '@/lib/utils/statusLabel';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { User } from '@/types/user';

const fetcher = (url: string) => api.get(url).then((res) => res.data);
const profileFetcher = (url: string) => api.get(url).then((res) => res.data.data);

type Summary = {
  total: number;
  present: number;
  late: number;
  absent: number;
  sick: number;
  excused: number;
  other: number;
};

const safeFormat = (value: unknown, fmt: string) => {
  try {
    const d =
      value instanceof Date
        ? value
        : new Date(
            typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '')
          );
    if (Number.isNaN(d.getTime())) return '-';
    return format(d, fmt, { locale: id });
  } catch {
    return '-';
  }
};

export default function StudentAttendanceRecap() {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const backToStudent = (location.state as { backToStudent?: string } | null)?.backToStudent;
  const classIdFromState = (location.state as { classId?: string } | null)?.classId;

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, classIdFromState]);

  const profileSwr = useSWR<User>(studentId ? `/users/${studentId}` : null, profileFetcher, {
    revalidateOnFocus: false,
  });
  const { data: profile, isInitialLoading: profileLoading } = useSwrPageState(profileSwr);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '50',
    userId: studentId,
  });
  if (classIdFromState) queryParams.append('classId', classIdFromState);
  if (startDate && endDate) {
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
  }

  const swr = useSWR(studentId ? `/reports?${queryParams.toString()}` : null, fetcher, {
    revalidateOnFocus: false,
  });
  const { data, isPending: loading, isError, retry } = useSwrPageState(swr);

  const reports = useMemo<Report[]>(() => {
    return Array.isArray(data?.data) ? (data.data.filter(Boolean) as Report[]) : [];
  }, [data?.data]);

  const meta = (data?.meta as (PaginationMeta & { summary?: Summary }) | undefined) ?? null;
  const providedSummary = meta?.summary ?? null;

  const computedSummary = useMemo(() => {
    if (providedSummary) return providedSummary;
    return reports.reduce(
      (acc, r) => {
        const s = String(r.status ?? '').toUpperCase();
        acc.total += 1;
        if (s === 'PRESENT') acc.present += 1;
        else if (s === 'LATE') acc.late += 1;
        else if (s === 'ABSENT') acc.absent += 1;
        else if (s === 'SICK') acc.sick += 1;
        else if (s === 'EXCUSED') acc.excused += 1;
        else acc.other += 1;
        return acc;
      },
      { total: 0, present: 0, late: 0, absent: 0, sick: 0, excused: 0, other: 0 }
    );
  }, [providedSummary, reports]);

  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const sessionTitle = String(r.session_title ?? '').toLowerCase();
      const className = String(r.class_name ?? '').toLowerCase();
      const status = String(r.status ?? '').toLowerCase();
      const date = String(r.session_date ?? '').toLowerCase();
      return (
        sessionTitle.includes(q) || className.includes(q) || status.includes(q) || date.includes(q)
      );
    });
  }, [reports, searchTerm]);

  if (!studentId) {
    return (
      <AdminPageShell title="Rekap kehadiran" variant="plain">
        <Button variant="outline" onClick={() => navigate('/classes')}>
          Kembali
        </Button>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Rekap Kehadiran Mahasiswa"
      description="Lihat ringkasan dan detail absensi mahasiswa sesuai scope akses Anda."
      variant="plain"
      icon={<FileText className="size-5" />}
      breadcrumb={
        <AdminBreadcrumbs
          items={[
            { label: 'Kelas', href: '/classes' },
            ...(classIdFromState
              ? [{ label: 'Detail Kelas', href: `/classes/${classIdFromState}` }]
              : []),
            { label: 'Mahasiswa', href: backToStudent || `/students/${studentId}` },
            { label: 'Rekap Kehadiran' },
          ]}
        />
      }
    >
      {isError ? (
        <ErrorWithRetry title="Gagal memuat rekap" error={swr.error} onRetry={retry} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Sesi
                </div>
                <div className="mt-2 text-2xl font-extrabold text-foreground">
                  {loading ? <Skeleton className="h-8 w-16" /> : computedSummary.total}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {profileLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : profile ? (
                    <>
                      {profile.name} • {profile.nim_nip || '—'}
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hadir
                </div>
                <div className="mt-2 text-2xl font-extrabold text-foreground">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    computedSummary.present + computedSummary.late
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Hadir: {computedSummary.present}</span>
                  <span>•</span>
                  <span>Terlambat: {computedSummary.late}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Alfa
                </div>
                <div className="mt-2 text-2xl font-extrabold text-foreground">
                  {loading ? <Skeleton className="h-8 w-16" /> : computedSummary.absent}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Tidak hadir tanpa keterangan
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Izin/Sakit
                </div>
                <div className="mt-2 text-2xl font-extrabold text-foreground">
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    computedSummary.excused + computedSummary.sick
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Izin: {computedSummary.excused}</span>
                  <span>•</span>
                  <span>Sakit: {computedSummary.sick}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">Detail Kehadiran</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Filter tanggal berlaku untuk semua record. Pencarian hanya pada data halaman ini.
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[260px]">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari sesi, kelas, status…"
                    className="pl-9"
                  />
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Dari tanggal"
                    className="w-full sm:w-[160px]"
                  />
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Sampai tanggal"
                    className="w-full sm:w-[160px]"
                    popoverAlign="end"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-5">
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-0">
                <AdminEmptyState
                  compact
                  icon={UserCircle2}
                  title="Belum ada data kehadiran"
                  description="Data akan muncul ketika mahasiswa memiliki riwayat absensi dalam scope akses Anda."
                  className="border-0 shadow-none"
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Sesi</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <AdminEmptyState
                              compact
                              icon={UserCircle2}
                              title="Tidak ada hasil"
                              description="Ubah kata kunci pencarian."
                              className="border-0 shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((r, idx) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-muted-foreground">
                              meta ? (meta.page - 1) * meta.limit + idx + 1 : idx + 1
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {safeFormat(r.session_date, 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="font-medium">{r.session_title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.class_name || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={attendanceBadgeVariant(r.status)}>
                                {attendanceStatusLabel(r.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {safeFormat(r.check_in_time, 'dd MMM yyyy, HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {meta ? (
                  <div className="border-t border-border">
                    <TablePagination meta={meta} onPageChange={setPage} itemLabel="absensi" />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
