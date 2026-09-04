import React, { useState } from 'react';
import api from '@/services/api';
import useSWR from 'swr';
import { useAuthStore } from '@/stores/authStore';
import { FileText, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
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
import type { Excuse } from '@/types/excuse';
import AdminPageShell from '@/components/AdminPageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { SlowLoadingHint } from '@/components/admin/SlowLoadingHint';
import { excuseStatusLabel } from '@/lib/utils/statusLabel';
import { excuseBadgeVariant, excuseReasonLabel } from '@/lib/utils/classLabel';
import { toastErrorMessage } from '@/lib/utils/toastMessage';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { useSwrPageState } from '@/hooks/useSwrPageState';
import { useClientPagination } from '@/hooks/useClientPagination';
import { TablePagination } from '@/components/ui/TablePagination';
import { FileText as FileTextIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ExcuseMyList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  const fetcher = (url: string) => api.get(url).then((res) => res.data.data);
  const swr = useSWR<Excuse[]>('/excuses/me', fetcher, { revalidateOnFocus: false });
  const {
    data: excuses = [],
    isPending: loading,
    isError,
    showSlowLoadingHint,
    retry,
    mutate,
  } = useSwrPageState(swr);
  const hasFilters = Boolean(searchTerm.trim()) || statusFilter !== 'ALL' || reasonFilter !== 'ALL';

  const resolveProofUrl = (proofUrl: string | null | undefined) => {
    if (!proofUrl) return null;
    if (proofUrl.startsWith('http') || proofUrl.startsWith('data:')) return proofUrl;
    const apiBase = String(import.meta.env.VITE_API_BASE_URL || '/api');
    const assetBase = apiBase.startsWith('http')
      ? new URL(apiBase).origin
      : apiBase.replace(/\/api\/?$/, '');
    return `${assetBase}${proofUrl}`;
  };

  const handleBatalkan = async (id: string) => {
    if (!window.confirm('Batalkan pengajuan ini?')) return;
    try {
      await api.delete(`/excuses/${id}`);
      toast.success('Pengajuan dibatalkan.');
      mutate();
    } catch (error: unknown) {
      toast.error(toastErrorMessage(error, 'Gagal membatalkan pengajuan'));
    }
  };

  const filteredExcuses = excuses.filter((ex) => {
    const matchSearch =
      (ex.session?.title && ex.session.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.description && ex.description.toLowerCase().includes(searchTerm.toLowerCase()));
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

  return (
    <AdminPageShell
      title="Pengajuan Saya"
      description="Daftar pengajuan izin & sakit yang Anda ajukan."
      variant="plain"
      icon={<FileText className="size-5" />}
      actions={
        <Button asChild>
          <Link to="/excuses">
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Ajukan Pengajuan Baru
          </Link>
        </Button>
      }
    >
      {isError ? (
        <ErrorWithRetry title="Gagal memuat pengajuan saya" error={swr.error} onRetry={retry} />
      ) : showSlowLoadingHint ? (
        <SlowLoadingHint onRetry={retry} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
          <div className="flex flex-col gap-5 border-b border-border p-5 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <Input
                type="text"
                placeholder="Cari sesi atau keterangan..."
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
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Tipe</SelectItem>
                <SelectItem value="SICK">Sakit</SelectItem>
                <SelectItem value="EXCUSED">Izin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ul className="space-y-3 p-5 md:hidden" aria-label="Daftar pengajuan saya">
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
                      : 'Pengajuan izin dan sakit yang Anda ajukan akan muncul di sini.'
                  }
                />
              </li>
            ) : (
              paginatedExcuses.map((excuse) => {
                const proofHref = resolveProofUrl(excuse.proof_url);
                return (
                  <li
                    key={excuse.id}
                    className="rounded-2xl border border-border p-4 border-border"
                  >
                    <p className="text-sm font-medium text-brand">{excuse.session?.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(
                        new Date(excuse.session?.session_start || excuse.created_at),
                        'dd MMM yyyy HH:mm',
                        { locale: localeId }
                      )}
                    </p>
                    {excuse.description ? (
                      <p
                        className="mt-2 text-xs text-muted-foreground line-clamp-2"
                        title={excuse.description}
                      >
                        {excuse.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={excuseBadgeVariant(excuse.reason)}>
                        {excuseReasonLabel(excuse.reason)}
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
                    {proofHref ? (
                      <a
                        href={proofHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-brand"
                      >
                        Lihat bukti
                      </a>
                    ) : null}
                    {excuse.status === 'PENDING' ? (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-11 flex-1 border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleBatalkan(excuse.id)}
                        >
                          Batalkan
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
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Sesi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredExcuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <AdminEmptyState
                        compact
                        icon={FileTextIcon}
                        title={hasFilters ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
                        description={
                          hasFilters
                            ? 'Ubah filter atau kata kunci pencarian.'
                            : 'Pengajuan izin dan sakit yang Anda ajukan akan muncul di sini.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExcuses.map((excuse) => (
                    <TableRow key={excuse.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(
                          new Date(excuse.session?.session_start || excuse.created_at),
                          'dd MMM yyyy',
                          { locale: localeId }
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800 dark:text-zinc-200">
                          {excuse.session?.title || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={excuseBadgeVariant(excuse.reason)}>
                          {excuseReasonLabel(excuse.reason)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p
                          className="text-xs max-w-xs truncate text-muted-foreground"
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
                            className="text-brand hover:underline text-sm"
                          >
                            Lihat
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
                      </TableCell>
                      <TableCell className="text-right">
                        {excuse.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleBatalkan(excuse.id)}
                          >
                            Batalkan
                          </Button>
                        )}
                      </TableCell>
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
    </AdminPageShell>
  );
}
