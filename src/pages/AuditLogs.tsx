import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Search, Activity, Calendar, Shield, Database, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit-logs');
        setLogs(res.data.data);
      } catch (error) {
        console.error('Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'success';
    if (action.includes('UPDATE')) return 'warning';
    if (action.includes('DELETE')) return 'destructive';
    return 'default';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <Database size={16} />;
    if (action.includes('UPDATE')) return <Activity size={16} />;
    if (action.includes('DELETE')) return <Trash2 size={16} />;
    return <Shield size={16} />;
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (log.target_table && log.target_table.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Log Sistem</h1>
        <p className="text-slate-500 dark:text-zinc-400">Jejak rekaman aktivitas pengguna dan perubahan data dalam sistem.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Cari aktivitas atau tabel target..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-zinc-950/50">
              <TableRow>
                <TableHead>Aktivitas</TableHead>
                <TableHead>Tabel Target</TableHead>
                <TableHead>ID Aktor</TableHead>
                <TableHead>Alamat IP</TableHead>
                <TableHead>Waktu Kejadian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">Memuat data...</TableCell></TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">Tidak ada data ditemukan.</TableCell></TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getActionColor(log.action) as any} className="gap-1.5">
                        {getActionIcon(log.action)}
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-zinc-300">
                      {log.target_table || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-zinc-400 font-mono text-sm">
                      {log.actor_id || 'System'}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-zinc-400 font-mono text-sm">
                      {log.ip_address || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300">
                        <Calendar size={14} />
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: id })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}