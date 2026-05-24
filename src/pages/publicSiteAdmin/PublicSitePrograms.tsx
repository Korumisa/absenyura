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
import { Badge } from '@/components/ui/badge';
import type { PublicProgram } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import PublicSiteProgramPreview from '@/components/publicSiteAdmin/PublicSiteProgramPreview';
import { ClipboardList } from 'lucide-react';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsPublishTabs } from '@/components/ui/CmsPublishTabs';
import { MobileTableHint } from '@/components/ui/MobileTableHint';
import { CmsPreviewCollapsible } from '@/components/ui/CmsPreviewCollapsible';
import { CmsViewSiteLink } from '@/components/cms/CmsViewSiteLink';

type PageTab = 'form' | 'list';
const PAGE_TABS: readonly CmsTabItem<PageTab>[] = [
  { id: 'form', label: 'Form' },
  { id: 'list', label: 'Daftar' },
];

export default function PublicSitePrograms() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: programs = [], mutate } = useSWR<PublicProgram[]>('/public-site/admin/programs', fetcher, { revalidateOnFocus: false });

  const [pageTab, setPageTab] = useState<PageTab>('form');
  const [form, setForm] = useState<{ id?: string; title?: string; description?: string; isPublished?: boolean }>({});
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const resetForm = () => setForm({});
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

  const dateRangePreview = dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || '';

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteDescription = useMemo(() => 'Yakin ingin menghapus program kerja ini?', []);

  const openDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/public-site/admin/programs/${deleteId}`);
      toast.success('Berhasil dihapus');
      setIsDeleteOpen(false);
      setDeleteId(null);
      mutate();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal menghapus'));
    }
  };

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateRange = dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || undefined;
      if (form.id) {
        await api.put(`/public-site/admin/programs/${form.id}`, {
          title: form.title,
          dateRange,
          description: form.description,
          isPublished: form.isPublished ?? false,
        });
        toast.success('Program kerja diperbarui');
      } else {
        await api.post('/public-site/admin/programs', {
          title: form.title,
          dateRange,
          description: form.description,
          isPublished: form.isPublished ?? false,
        });
        toast.success('Program kerja ditambahkan');
      }
      resetForm();
      setDateStart('');
      setDateEnd('');
      setPageTab('list');
      mutate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan'));
    }
  };

  return (
    <AdminPageShell
      title="Program Kerja"
      description="Kelola daftar program kerja yang akan tampil di halaman publik."
      variant="plain"
      icon={<ClipboardList size={22} />}
      actions={<CmsViewSiteLink href="/program-kerja" label="Lihat program kerja" />}
    >
      <CmsTabNav<PageTab> tabs={PAGE_TABS} value={pageTab} onChange={setPageTab} ariaLabel="Bagian program kerja" />
      <p className="text-sm text-slate-500 dark:text-zinc-400" aria-live="polite">
        Langkah: {pageTab === 'form' ? '1 — Form program' : '2 — Daftar program'}
      </p>

      {pageTab === 'form' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_minmax(280px,340px)]">
          <AdminCard title="Form Program" description="Tambah atau ubah program kerja.">
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
              <div className="space-y-2 md:col-span-2">
                <Label>Status publikasi</Label>
                <CmsPublishTabs published={form.isPublished ?? false} onChange={(v) => setForm((p) => ({ ...p, isPublished: v }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Deskripsi</Label>
                <Textarea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
                {form.id ? (
                  <Button variant="outline" type="button" className="min-h-11" onClick={resetForm}>
                    Batal
                  </Button>
                ) : null}
                <Button type="submit" className="min-h-11">
                  {form.id ? 'Update' : 'Tambah'}
                </Button>
              </div>
            </form>
          </AdminCard>
          <CmsPreviewCollapsible>
            <PublicSiteProgramPreview
              title={form.title}
              dateRange={dateRangePreview}
              description={form.description}
              isPublished={form.isPublished}
            />
          </CmsPreviewCollapsible>
        </div>
      ) : (
        <AdminCard title="Daftar Program" description="Program kerja yang tersimpan di CMS.">
          <ul className="space-y-3 md:hidden" aria-label="Daftar program">
            {programs.map((p) => (
              <li key={p.id} className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
                <p className="font-bold text-slate-900 dark:text-white">{p.title}</p>
                <p className="text-sm text-slate-500">{p.date_range ?? '—'}</p>
                <Badge className="mt-2" variant={p.is_published ? 'success' : 'secondary'}>
                  {p.is_published ? 'Publik' : 'Draft'}
                </Badge>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 flex-1"
                    type="button"
                    onClick={() => {
                      setForm({
                        id: p.id,
                        title: p.title,
                        description: p.description ?? '',
                        isPublished: p.is_published,
                      });
                      resetDatesFromRange(p.date_range ?? '');
                      setPageTab('form');
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="min-h-11" type="button" onClick={() => openDelete(p.id)}>
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <MobileTableHint />
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-slate-500">
                      Belum ada program.
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.date_range ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_published ? 'success' : 'secondary'}>{p.is_published ? 'Publik' : 'Draft'}</Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-9"
                          type="button"
                          onClick={() => {
                            setForm({
                              id: p.id,
                              title: p.title,
                              description: p.description ?? '',
                              isPublished: p.is_published,
                            });
                            resetDatesFromRange(p.date_range ?? '');
                            setPageTab('form');
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="min-h-9" type="button" onClick={() => openDelete(p.id)}>
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </AdminCard>
      )}

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
    </AdminPageShell>
  );
}
