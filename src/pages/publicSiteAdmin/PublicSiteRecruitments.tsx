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
import type { PublicRecruitment } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { prepareImageForUpload } from '@/lib/media/imageUpload';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import PublicSiteRecruitmentPreview from '@/components/publicSiteAdmin/PublicSiteRecruitmentPreview';
import { FileText } from 'lucide-react';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsPublishTabs } from '@/components/ui/CmsPublishTabs';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { CmsListToolbar } from '@/components/cms/CmsListToolbar';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';

type PageTab = 'form' | 'list';
type FormTab = 'info' | 'team';

const PAGE_TABS: readonly CmsTabItem<PageTab>[] = [
  { id: 'list', label: 'Daftar' },
  { id: 'form', label: 'Editor' },
];

const FORM_TABS: readonly CmsTabItem<FormTab>[] = [
  { id: 'info', label: 'Informasi' },
  { id: 'team', label: 'Panitia & Kontak' },
];

export default function PublicSiteRecruitments() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: recruitments = [], mutate } = useSWR<PublicRecruitment[]>(
    '/public-site/admin/recruitments',
    fetcher,
    { revalidateOnFocus: false }
  );

  const [pageTab, setPageTab] = useState<PageTab>('list');
  const [formTab, setFormTab] = useState<FormTab>('info');

  type CommitteeDraft = { name: string; role: string };
  type ContactDraft = { name: string; contact: string };
  const [form, setForm] = useState<{
    id?: string;
    title?: string;
    description?: string;
    formUrl?: string;
    posterImageUrl?: string;
    isPublished?: boolean;
    committee?: CommitteeDraft[];
    contacts?: ContactDraft[];
  }>({ committee: [], contacts: [] });
  const resetForm = () => setForm({ committee: [], contacts: [] });
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);

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

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, {
      maxBytes: 4 * 1024 * 1024,
      maxWidth: 1600,
      quality: 0.82,
    });
    const formData = new FormData();
    formData.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url as string;
  };

  const validatePublish = (): string | null => {
    if (!form.isPublished) return null;
    if (!dateStart.trim() && !dateEnd.trim()) {
      return 'Isi periode pendaftaran (tanggal mulai & selesai) sebelum mempublikasikan.';
    }
    const url = String(form.formUrl ?? '').trim();
    if (!url || !/^https:\/\/.+/i.test(url)) {
      return 'Link form pendaftaran (https://) wajib diisi sebelum mempublikasikan.';
    }
    return null;
  };

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    const publishErr = validatePublish();
    if (publishErr) {
      toast.error(publishErr);
      return;
    }
    try {
      const dateRange =
        dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || undefined;
      const committee = (form.committee ?? []).map((x, idx) => ({
        name: x.name,
        role: x.role,
        sortOrder: idx,
      }));
      const contacts = (form.contacts ?? []).map((x, idx) => ({
        name: x.name,
        contact: x.contact,
        sortOrder: idx,
      }));
      if (form.id) {
        await api.put(`/public-site/admin/recruitments/${form.id}`, {
          title: form.title,
          dateRange,
          description: form.description,
          formUrl: form.formUrl,
          posterImageUrl: form.posterImageUrl,
          isPublished: form.isPublished ?? false,
          committee,
          contacts,
        });
        toast.success('Open recruitment diperbarui');
      } else {
        await api.post('/public-site/admin/recruitments', {
          title: form.title,
          dateRange,
          description: form.description,
          formUrl: form.formUrl,
          posterImageUrl: form.posterImageUrl,
          isPublished: form.isPublished ?? false,
          committee,
          contacts,
        });
        toast.success('Open recruitment ditambahkan');
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

  const loadForEdit = (r: PublicRecruitment) => {
    setForm({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      formUrl: r.form_url ?? '',
      posterImageUrl: r.poster_image_url ?? '',
      isPublished: r.is_published,
      committee: (r.committee ?? []).map((x) => ({ name: x.name, role: x.role })),
      contacts: (r.contacts ?? []).map((x) => ({ name: x.name, contact: x.contact })),
    });
    resetDatesFromRange(r.date_range ?? '');
    setFormTab('info');
    setPageTab('form');
  };

  return (
    <AdminPageShell
      title="Open Recruitment"
      description="Kelola informasi open recruitment yang tampil di halaman publik."
      variant="plain"
      icon={<FileText size={22} />}
    >
      <CmsTabNav<PageTab>
        tabs={PAGE_TABS}
        value={pageTab}
        onChange={setPageTab}
        ariaLabel="Mode recruitment"
      />

      {pageTab === 'form' ? (
        <AdminContentTransition contentKey={`form-${form.id ?? 'new'}-${formTab}`}>
          <CmsEditorLayout
            preview={
              <PublicSiteRecruitmentPreview
                title={form.title}
                dateRange={dateRangePreview}
                description={form.description}
                formUrl={form.formUrl}
                posterImageUrl={form.posterImageUrl}
                isPublished={form.isPublished}
                committeeCount={form.committee?.length ?? 0}
                contactsCount={form.contacts?.length ?? 0}
              />
            }
          >
            <AdminCard
              title={form.id ? 'Ubah recruitment' : 'Recruitment baru'}
              description="Informasi umum dan data panitia."
            >
              <form onSubmit={upsert} className="space-y-5">
                <CmsTabNav<FormTab>
                  tabs={FORM_TABS}
                  value={formTab}
                  onChange={setFormTab}
                  ariaLabel="Bagian form recruitment"
                />

                <div className={formTab === 'info' ? 'grid gap-4 md:grid-cols-2' : 'hidden'}>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="recruitment-title">Judul</Label>
                    <Input
                      id="recruitment-title"
                      value={form.title ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recruitment-date-start">Tanggal Mulai</Label>
                    <Input
                      id="recruitment-date-start"
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recruitment-date-end">Tanggal Selesai</Label>
                    <Input
                      id="recruitment-date-end"
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recruitment-form-url">Link Form</Label>
                    <Input
                      id="recruitment-form-url"
                      value={form.formUrl ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, formUrl: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Status publikasi</Label>
                    <CmsPublishTabs
                      published={form.isPublished ?? false}
                      onChange={(v) => setForm((p) => ({ ...p, isPublished: v }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="recruitment-description">Deskripsi</Label>
                    <Textarea
                      id="recruitment-description"
                      value={form.description ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Poster</Label>
                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                      <div className="space-y-2">
                        <Input
                          id="recruitment-poster"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPoster}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingPoster(true);
                            try {
                              const url = await uploadImage(file);
                              setForm((p) => ({ ...p, posterImageUrl: url }));
                              toast.success('Upload poster berhasil');
                            } catch (err: any) {
                              toast.error(getErrorMessage(err, 'Gagal upload poster'));
                            } finally {
                              setUploadingPoster(false);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            asChild
                            variant="outline"
                            disabled={uploadingPoster}
                            className="min-h-11"
                          >
                            <Label htmlFor="recruitment-poster" className="cursor-pointer">
                              {uploadingPoster
                                ? 'Uploading...'
                                : form.posterImageUrl
                                  ? 'Ganti Poster'
                                  : 'Upload Poster'}
                            </Label>
                          </Button>
                          {form.posterImageUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="min-h-11"
                              onClick={() => setForm((p) => ({ ...p, posterImageUrl: '' }))}
                              disabled={uploadingPoster}
                            >
                              Hapus
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const el = document.getElementById('recruitment-poster-url-toggle');
                              el?.classList.toggle('hidden');
                            }}
                          >
                            Atau masukkan URL secara manual
                          </Button>
                        </div>
                        <div id="recruitment-poster-url-toggle" className="hidden space-y-2">
                          <Label
                            htmlFor="recruitment-poster-url"
                            className="text-xs text-muted-foreground"
                          >
                            Poster Image URL
                          </Label>
                          <Input
                            id="recruitment-poster-url"
                            value={form.posterImageUrl ?? ''}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, posterImageUrl: e.target.value }))
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border">
                        <div className="aspect-[4/5] w-full bg-slate-100 bg-background">
                          {form.posterImageUrl ? (
                            <img
                              src={form.posterImageUrl}
                              alt="Poster"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              Belum ada poster
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={formTab === 'team' ? 'space-y-6' : 'hidden'}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label>Panitia</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            committee: [...(p.committee ?? []), { name: '', role: '' }],
                          }))
                        }
                      >
                        Tambah Panitia
                      </Button>
                    </div>
                    {(form.committee ?? []).length === 0 ? (
                      <div className="rounded-xl border border-dashed rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        Belum ada panitia.
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
                                  committee: (p.committee ?? []).map((x, i) =>
                                    i === idx ? { ...x, name: e.target.value } : x
                                  ),
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
                                    committee: (p.committee ?? []).map((x, i) =>
                                      i === idx ? { ...x, role: e.target.value } : x
                                    ),
                                  }))
                                }
                                placeholder="Jabatan"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 shrink-0"
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    committee: (p.committee ?? []).filter((_, i) => i !== idx),
                                  }))
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

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label>Contact Person</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            contacts: [...(p.contacts ?? []), { name: '', contact: '' }],
                          }))
                        }
                      >
                        Tambah Kontak
                      </Button>
                    </div>
                    {(form.contacts ?? []).length === 0 ? (
                      <div className="rounded-xl border border-dashed rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        Belum ada kontak.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(form.contacts ?? []).map((c, idx) => (
                          <div key={idx} className="grid gap-3 md:grid-cols-2">
                            <Input
                              value={c.name}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  contacts: (p.contacts ?? []).map((x, i) =>
                                    i === idx ? { ...x, name: e.target.value } : x
                                  ),
                                }))
                              }
                              placeholder="Nama"
                            />
                            <div className="flex gap-2">
                              <Input
                                value={c.contact}
                                onChange={(e) =>
                                  setForm((p) => ({
                                    ...p,
                                    contacts: (p.contacts ?? []).map((x, i) =>
                                      i === idx ? { ...x, contact: e.target.value } : x
                                    ),
                                  }))
                                }
                                placeholder="Telepon / link"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 shrink-0"
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    contacts: (p.contacts ?? []).filter((_, i) => i !== idx),
                                  }))
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
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setPageTab('list')}
                  >
                    Kembali ke daftar
                  </Button>
                  {form.id ? (
                    <Button variant="ghost" type="button" className="min-h-11" onClick={resetForm}>
                      Reset
                    </Button>
                  ) : null}
                  <Button type="submit" className="min-h-11">
                    {form.id ? 'Simpan' : 'Tambah recruitment'}
                  </Button>
                </div>
              </form>
            </AdminCard>
          </CmsEditorLayout>
        </AdminContentTransition>
      ) : (
        <AdminContentTransition contentKey="list-recruitments">
          <AdminCard
            title="Daftar recruitment"
            description="Open recruitment yang tampil di situs publik."
          >
            <CmsListToolbar
              count={recruitments.length}
              countLabel="recruitment"
              onCreate={() => {
                resetForm();
                setDateStart('');
                setDateEnd('');
                setFormTab('info');
                setPageTab('form');
              }}
            />
            <ul className="space-y-4 md:hidden" aria-label="Daftar recruitment">
              {recruitments.length === 0 ? (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada recruitment.
                </li>
              ) : null}
              {recruitments.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border p-4 border-border">
                  <p className="font-bold text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.date_range ?? '—'}</p>
                  <Badge className="mt-2" variant={r.is_published ? 'success' : 'secondary'}>
                    {r.is_published ? 'Publik' : 'Draft'}
                  </Badge>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 flex-1"
                      type="button"
                      onClick={() => loadForEdit(r)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="min-h-11"
                      type="button"
                      onClick={() => openDelete(r.id)}
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
                  {recruitments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Belum ada recruitment.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {recruitments.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{r.date_range ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_published ? 'success' : 'secondary'}>
                          {r.is_published ? 'Publik' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => loadForEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={() => openDelete(r.id)}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
