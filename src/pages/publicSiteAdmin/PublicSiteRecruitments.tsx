import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PublicRecruitment } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';

export default function PublicSiteRecruitments() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: recruitments = [], mutate } = useSWR<PublicRecruitment[]>('/public-site/admin/recruitments', fetcher, { revalidateOnFocus: false });

  type CommitteeDraft = { name: string; role: string };
  const [form, setForm] = useState<{
    id?: string;
    title?: string;
    description?: string;
    formUrl?: string;
    isPublished?: boolean;
    committee?: CommitteeDraft[];
  }>({ committee: [] });
  const resetForm = () => setForm({});
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const resetDatesFromRange = (range: string) => {
    const raw = String(range ?? '').trim();
    if (!raw) {
      setDateStart('');
      setDateEnd('');
      return;
    }
    const parts = raw.split(' - ');
    if (parts.length >= 2) {
      setDateStart(parts[0] || '');
      setDateEnd(parts.slice(1).join(' - ') || '');
      return;
    }
    setDateStart(raw);
    setDateEnd('');
  };

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateRange = dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || undefined;
      const committee = (form.committee ?? []).map((x, idx) => ({ name: x.name, role: x.role, sortOrder: idx }));
      if (form.id) {
        await api.put(`/public-site/admin/recruitments/${form.id}`, {
          title: form.title,
          dateRange,
          description: form.description,
          formUrl: form.formUrl,
          isPublished: form.isPublished ?? false,
          committee,
        });
        toast.success('Open recruitment diperbarui');
      } else {
        await api.post('/public-site/admin/recruitments', {
          title: form.title,
          dateRange,
          description: form.description,
          formUrl: form.formUrl,
          isPublished: form.isPublished ?? false,
          committee,
        });
        toast.success('Open recruitment ditambahkan');
      }
      resetForm();
      setDateStart('');
      setDateEnd('');
      mutate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan'));
    }
  };

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteDescription = useMemo(() => 'Yakin ingin menghapus open recruitment ini?', []);

  const openDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/public-site/admin/recruitments/${deleteId}`);
      toast.success('Berhasil dihapus');
      setIsDeleteOpen(false);
      setDeleteId(null);
      mutate();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal menghapus'));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Open Recruitment</h1>
        <p className="text-slate-500 dark:text-zinc-400">Kelola informasi open recruitment yang tampil di halaman publik.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-6">
        <form onSubmit={upsert} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Judul</Label>
            <Input value={form.title ?? ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Mulai</Label>
            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Selesai</Label>
            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Link Form</Label>
            <Input value={form.formUrl ?? ''} onChange={(e) => setForm((p) => ({ ...p, formUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Publik</Label>
            <Select value={(form.isPublished ?? false) ? 'true' : 'false'} onValueChange={(v) => setForm((p) => ({ ...p, isPublished: v === 'true' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Draft</SelectItem>
                <SelectItem value="true">Publish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="space-y-3 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Panitia</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm((p) => ({ ...p, committee: [...(p.committee ?? []), { name: '', role: '' }] }))}
              >
                Tambah Panitia
              </Button>
            </div>
            {(form.committee ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
                Belum ada panitia. Klik “Tambah Panitia”.
              </div>
            ) : (
              <div className="space-y-3">
                {(form.committee ?? []).map((c, idx) => (
                  <div key={idx} className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={c.name}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          committee: (p.committee ?? []).map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                        }))
                      }
                      placeholder="Nama"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={c.role}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            committee: (p.committee ?? []).map((x, i) => (i === idx ? { ...x, role: e.target.value } : x)),
                          }))
                        }
                        placeholder="Jabatan"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setForm((p) => ({ ...p, committee: (p.committee ?? []).filter((_, i) => i !== idx) }))
                        }
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            {form.id ? (
              <Button variant="outline" type="button" onClick={resetForm}>
                Batal
              </Button>
            ) : null}
            <Button type="submit">{form.id ? 'Update' : 'Tambah'}</Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruitments.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.date_range ?? '-'}</TableCell>
                  <TableCell>{r.is_published ? 'Publish' : 'Draft'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        (setForm({
                          id: r.id,
                          title: r.title,
                          description: r.description ?? '',
                          formUrl: r.form_url ?? '',
                          isPublished: r.is_published,
                          committee: (r.committee ?? []).map((x) => ({ name: x.name, role: x.role })),
                        }),
                        resetDatesFromRange(r.date_range ?? ''))
                      }
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" type="button" onClick={() => openDelete(r.id)}>
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus"
        description={deleteDescription}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}

