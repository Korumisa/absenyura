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
import { prepareImageForUpload } from '@/lib/imageUpload';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { FileText } from 'lucide-react';

export default function PublicSiteRecruitments() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: recruitments = [], mutate } = useSWR<PublicRecruitment[]>('/public-site/admin/recruitments', fetcher, { revalidateOnFocus: false });

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
  }>({ committee: [] });
  const resetForm = () => setForm({});
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

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, { maxBytes: 4 * 1024 * 1024, maxWidth: 1600, quality: 0.82 });
    const formData = new FormData();
    formData.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  };

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateRange = dateStart && dateEnd ? `${dateStart} - ${dateEnd}` : dateStart || dateEnd || undefined;
      const committee = (form.committee ?? []).map((x, idx) => ({ name: x.name, role: x.role, sortOrder: idx }));
      const contacts = (form.contacts ?? []).map((x, idx) => ({ name: x.name, contact: x.contact, sortOrder: idx }));
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
    <AdminPageShell
      title="Open Recruitment"
      description="Kelola informasi open recruitment yang tampil di halaman publik."
      variant="plain"
      icon={<FileText size={22} />}
    >
      <AdminCard title="Form Recruitment" description="Tambah atau ubah informasi dan panitia.">
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
          <div className="space-y-2 md:col-span-2">
            <Label>Poster Image URL</Label>
            <Input value={form.posterImageUrl ?? ''} onChange={(e) => setForm((p) => ({ ...p, posterImageUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Upload Poster</Label>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <input
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" disabled={uploadingPoster}>
                    <Label htmlFor="recruitment-poster" className="cursor-pointer">
                      {uploadingPoster ? 'Uploading...' : form.posterImageUrl ? 'Ganti Poster' : 'Upload Poster'}
                    </Label>
                  </Button>
                  {form.posterImageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setForm((p) => ({ ...p, posterImageUrl: '' }))}
                      disabled={uploadingPoster}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">PNG/JPG. Maks 4MB.</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/40">
                <div className="aspect-[4/5] w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.03))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(255,255,255,0.04))]">
                  {form.posterImageUrl ? (
                    <img src={form.posterImageUrl} alt="Poster" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-slate-500 dark:text-zinc-300">
                      Belum ada poster
                    </div>
                  )}
                </div>
              </div>
            </div>
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

          <div className="space-y-3 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Contact Person</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm((p) => ({ ...p, contacts: [...(p.contacts ?? []), { name: '', contact: '' }] }))}
              >
                Tambah Kontak
              </Button>
            </div>
            {(form.contacts ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
                Belum ada kontak. Klik “Tambah Kontak”.
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
                          contacts: (p.contacts ?? []).map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
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
                            contacts: (p.contacts ?? []).map((x, i) => (i === idx ? { ...x, contact: e.target.value } : x)),
                          }))
                        }
                        placeholder="WhatsApp/Link (contoh: 0812... atau https://wa.me/62...)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm((p) => ({ ...p, contacts: (p.contacts ?? []).filter((_, i) => i !== idx) }))}
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
      </AdminCard>

      <AdminCard title="Daftar Recruitment" description="Data yang tersimpan di CMS.">
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800">
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
                          posterImageUrl: r.poster_image_url ?? '',
                          isPublished: r.is_published,
                          committee: (r.committee ?? []).map((x) => ({ name: x.name, role: x.role })),
                          contacts: (r.contacts ?? []).map((x) => ({ name: x.name, contact: x.contact })),
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
      </AdminCard>

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

