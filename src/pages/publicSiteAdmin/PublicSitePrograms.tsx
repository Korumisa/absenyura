import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PublicProgram } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import PublicSiteProgramPreview from '@/components/publicSiteAdmin/PublicSiteProgramPreview';
import { ClipboardList } from 'lucide-react';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsPublishTabs } from '@/components/ui/CmsPublishTabs';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { CmsListToolbar } from '@/components/cms/CmsListToolbar';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';
import { useFormDirtyGuard } from '@/hooks/useFormDirtyGuard';

type PageTab = 'form' | 'list';
const PAGE_TABS: readonly CmsTabItem<PageTab>[] = [
  { id: 'list', label: 'Daftar' },
  { id: 'form', label: 'Editor' },
];

export default function PublicSitePrograms() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: programs = [], mutate } = useSWR<PublicProgram[]>(
    '/public-site/admin/programs',
    fetcher,
    { revalidateOnFocus: false }
  );

  const [pageTab, setPageTab] = useState<PageTab>('list');
  const [form, setForm] = useState<{
    id?: string;
    title?: string;
    description?: string;
    isPublished?: boolean;
    division?: string;
    fundingSource?: string;
    location?: string;
    target?: string;
    rationale?: string;
  }>({});
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dirty, setDirty] = useState(false);
  const { confirmIfDirty } = useFormDirtyGuard(dirty);

  const setFormDirty = useMemo(
    () => (updater: React.SetStateAction<typeof form>) => {
      setDirty(true);
      setForm(updater);
    },
    []
  );
  const setDateStartDirty = (v: string) => {
    setDirty(true);
    setDateStart(v);
  };
  const setDateEndDirty = (v: string) => {
    setDirty(true);
    setDateEnd(v);
  };
  const resetForm = () => {
    setForm({});
    setDirty(false);
  };
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

  const dateRangePreview =
    dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || '';

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
      const dateRange =
        dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || undefined;
      if (form.id) {
        await api.put(`/public-site/admin/programs/${form.id}`, {
          title: form.title,
          dateRange,
          description: form.description,
          isPublished: form.isPublished ?? false,
          division: form.division,
          fundingSource: form.fundingSource,
          location: form.location,
          target: form.target,
          rationale: form.rationale,
        });
        toast.success('Program kerja diperbarui');
      } else {
        await api.post('/public-site/admin/programs', {
          title: form.title,
          dateRange,
          description: form.description,
          isPublished: form.isPublished ?? false,
          division: form.division,
          fundingSource: form.fundingSource,
          location: form.location,
          target: form.target,
          rationale: form.rationale,
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
    >
      <CmsTabNav<PageTab>
        tabs={PAGE_TABS}
        value={pageTab}
        onChange={async (next) => {
          const ok = await confirmIfDirty();
          if (ok) setPageTab(next);
        }}
        ariaLabel="Mode program kerja"
      />

      {pageTab === 'form' ? (
        <AdminContentTransition contentKey={`form-${form.id ?? 'new'}`}>
          <CmsEditorLayout
            preview={
              <PublicSiteProgramPreview
                title={form.title}
                dateRange={dateRangePreview}
                description={form.rationale ?? form.description}
                isPublished={form.isPublished}
                division={form.division}
                fundingSource={form.fundingSource}
                location={form.location}
                target={form.target}
              />
            }
          >
            <AdminCard
              title={form.id ? 'Ubah program' : 'Program baru'}
              description="Isi detail program kerja."
            >
              <form onSubmit={upsert} className="space-y-4">
                <div className="space-y-2">
                  <Label>Judul</Label>
                  <Input
                    value={form.title ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tanggal mulai</Label>
                    <Input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal selesai</Label>
                    <Input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEndDirty(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Divisi</Label>
                  <Input
                    value={form.division ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, division: e.target.value }))}
                    placeholder="Divisi yang bertanggung jawab"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sumber Dana</Label>
                  <Input
                    value={form.fundingSource ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, fundingSource: e.target.value }))}
                    placeholder="Sumber dana program"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lokasi</Label>
                  <Input
                    value={form.location ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Lokasi program"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Input
                    value={form.target ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, target: e.target.value }))}
                    placeholder="Target program"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status publikasi</Label>
                  <CmsPublishTabs
                    published={form.isPublished ?? false}
                    onChange={(v) => setFormDirty((p) => ({ ...p, isPublished: v }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rasional / Deskripsi</Label>
                  <Textarea
                    rows={5}
                    value={form.rationale ?? form.description ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, rationale: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={async () => {
                      const ok = await confirmIfDirty();
                      if (ok) setPageTab('list');
                    }}
                  >
                    Kembali ke daftar
                  </Button>
                  {form.id ? (
                    <Button variant="ghost" type="button" className="min-h-11" onClick={resetForm}>
                      Reset
                    </Button>
                  ) : null}
                  <Button type="submit" className="min-h-11">
                    {form.id ? 'Simpan' : 'Tambah program'}
                  </Button>
                </div>
              </form>
            </AdminCard>
          </CmsEditorLayout>
        </AdminContentTransition>
      ) : (
        <AdminContentTransition contentKey="list-programs">
          <AdminCard title="Daftar program" description="Semua program kerja di CMS.">
            <CmsListToolbar
              count={programs.length}
              countLabel="program"
              onCreate={async () => {
                const ok = await confirmIfDirty();
                if (!ok) return;
                resetForm();
                setDateStart('');
                setDateEnd('');
                setPageTab('form');
              }}
            />
            <ul className="space-y-4 md:hidden" aria-label="Daftar program">
              {programs.map((p) => (
                <li key={p.id} className="rounded-2xl border border-border p-4">
                  <p className="font-bold text-foreground">{p.title}</p>
                  <p className="text-sm text-muted-foreground">{p.date_range ?? '—'}</p>
                  <Badge className="mt-2" variant={p.is_published ? 'success' : 'secondary'}>
                    {p.is_published ? 'Publik' : 'Draft'}
                  </Badge>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 flex-1"
                      type="button"
                      onClick={async () => {
                        const ok = await confirmIfDirty();
                        if (!ok) return;
                        setForm({
                          id: p.id,
                          title: p.title,
                          description: p.description ?? '',
                          isPublished: p.is_published,
                          division: p.division ?? '',
                          fundingSource: p.funding_source ?? '',
                          location: p.location ?? '',
                          target: p.target ?? '',
                          rationale: p.rationale ?? p.description ?? '',
                        });
                        resetDatesFromRange(p.date_range ?? '');
                        setDirty(false);
                        setPageTab('form');
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="min-h-11"
                      type="button"
                      onClick={() => openDelete(p.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        Belum ada program.
                      </TableCell>
                    </TableRow>
                  ) : (
                    programs.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell>{p.date_range ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant={p.is_published ? 'success' : 'secondary'}>
                            {p.is_published ? 'Publik' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-9"
                            type="button"
                            onClick={async () => {
                              const ok = await confirmIfDirty();
                              if (!ok) return;
                              setForm({
                                id: p.id,
                                title: p.title,
                                description: p.description ?? '',
                                isPublished: p.is_published,
                                division: p.division ?? '',
                                fundingSource: p.funding_source ?? '',
                                location: p.location ?? '',
                                target: p.target ?? '',
                                rationale: p.rationale ?? p.description ?? '',
                              });
                              resetDatesFromRange(p.date_range ?? '');
                              setDirty(false);
                              setPageTab('form');
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="min-h-9"
                            type="button"
                            onClick={() => openDelete(p.id)}
                          >
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
        </AdminContentTransition>
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
