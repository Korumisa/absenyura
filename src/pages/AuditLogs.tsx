import React, { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { Search, Activity, Calendar, Shield, Database, Trash2, LogIn, User } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminPageShell from '@/components/AdminPageShell';
import { ErrorWithRetry } from '@/components/ErrorWithRetry';
import { TablePagination } from '@/components/ui/TablePagination';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditLog } from '@/types/audit';
import type { PaginationMeta } from '@/types/common';
import {
  formatAuditDetail,
  getAuditActionLabel,
  getAuditActionVariant,
  getAuditTableLabel,
} from '@/lib/utils/auditActionLabel';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<unknown>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (error) {
      setFetchError(error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const getActionIcon = (action: string) => {
    const upper = action.toUpperCase();
    if (upper.includes('LOGIN')) return <LogIn size={16} />;
    if (upper.includes('CREATE') || upper.includes('IMPORT')) return <Database size={16} />;
    if (upper.includes('UPDATE') || upper.includes('OVERRIDE')) return <Activity size={16} />;
    if (upper.includes('DELETE')) return <Trash2 size={16} />;
    return <Shield size={16} />;
  };

  const renderLogRow = (log: AuditLog) => {
    const detail = formatAuditDetail(log);
    return (
      <>
        <Badge
          variant={getAuditActionVariant(log.action) as 'default' | 'destructive' | 'secondary'}
          className="gap-1.5 font-normal"
        >
          {getActionIcon(log.action)}
          {getAuditActionLabel(log.action)}
        </Badge>
        <p className="mt-1 font-mono text-[10px] text-slate-400">{log.action}</p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {getAuditTableLabel(log.target_table)}
        </p>
        {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{log.actor_id ? `Pengguna ${log.actor_id.slice(0, 8)}…` : 'Sistem'}</span>
          <span>{log.ip_address || '—'}</span>
          <span>{format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: id })}</span>
        </div>
      </>
    );
  };

  return (
    <AdminPageShell
      title="Audit Log Sistem"
      description="Jejak aktivitas penting: masuk sistem, perubahan pengguna, dan penyesuaian kehadiran."
      variant="plain"
      icon={<Shield className="size-5" />}
    >
      {fetchError ? (
        <ErrorWithRetry title="Gagal memuat audit log" error={fetchError} onRetry={loadLogs} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
          <div className="border-b border-border p-5">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari aktivitas, tabel, ID pengguna, atau IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ul className="space-y-3 p-5 md:hidden" aria-label="Daftar audit log">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="rounded-2xl border border-border bg-card p-4">
                  <Skeleton className="h-6 w-32 rounded-full" />
                  <Skeleton className="mt-3 h-3 w-20" />
                  <Skeleton className="mt-4 h-4 w-36" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-4 h-3 w-40" />
                </li>
              ))
            ) : logs.length === 0 ? (
              <li>
                <AdminEmptyState
                  compact
                  icon={Shield}
                  title={searchTerm ? 'Tidak ada hasil' : 'Belum ada aktivitas'}
                  description={
                    searchTerm
                      ? 'Ubah kata kunci pencarian.'
                      : 'Aktivitas sistem akan tercatat di sini.'
                  }
                />
              </li>
            ) : (
              logs.map((log) => (
                <li key={log.id} className="rounded-2xl border border-border bg-card p-4">
                  {renderLogRow(log)}
                </li>
              ))
            )}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                <TableRow>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <AdminEmptyState
                        compact
                        icon={Shield}
                        title={searchTerm ? 'Tidak ada hasil' : 'Belum ada aktivitas'}
                        description={
                          searchTerm
                            ? 'Ubah kata kunci pencarian.'
                            : 'Aktivitas sistem akan tercatat di sini.'
                        }
                        className="border-0 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const detail = formatAuditDetail(log);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge
                            variant={
                              getAuditActionVariant(log.action) as
                                | 'default'
                                | 'destructive'
                                | 'secondary'
                            }
                            className="gap-1.5 font-normal"
                          >
                            {getActionIcon(log.action)}
                            {getAuditActionLabel(log.action)}
                          </Badge>
                          <p className="mt-1 font-mono text-[10px] text-slate-400">{log.action}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-muted-foreground">
                            {getAuditTableLabel(log.target_table)}
                          </p>
                          {log.target_id ? (
                            <p
                              className="mt-0.5 truncate font-mono text-xs text-slate-400"
                              title={log.target_id}
                            >
                              {log.target_id.slice(0, 8)}…
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-zinc-300">
                            <User size={14} className="shrink-0 text-slate-400" />
                            {log.actor_id ? (
                              <span className="font-mono text-xs" title={log.actor_id}>
                                {log.actor_id.slice(0, 8)}…
                              </span>
                            ) : (
                              <span className="text-slate-400">Sistem</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                          {detail ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {log.ip_address || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-zinc-300">
                            <Calendar size={14} className="shrink-0 text-slate-400" />
                            <span>
                              {format(new Date(log.created_at), 'dd MMM yyyy', { locale: id })}
                              <br />
                              <span className="text-xs text-slate-400">
                                {format(new Date(log.created_at), 'HH:mm:ss')}
                              </span>
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {meta ? <TablePagination meta={meta} onPageChange={setPage} itemLabel="log" /> : null}
        </div>
      )}
    </AdminPageShell>
  );
}
