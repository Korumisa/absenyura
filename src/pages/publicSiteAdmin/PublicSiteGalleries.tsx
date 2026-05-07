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
import type { PublicGalleryAlbum } from '@/types/publicSite';

export default function PublicSiteGalleries() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: galleries = [], mutate } = useSWR<PublicGalleryAlbum[]>('/public-site/admin/galleries', fetcher, { revalidateOnFocus: false });

  const [form, setForm] = useState<{ id?: string; title?: string; description?: string; isPublished?: boolean; itemsJson?: string }>({});
  const resetForm = () => setForm({});

  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/public-site/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  };

  const [uploading, setUploading] = useState(false);

  const appendItemsFromFiles = async (files: FileList) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of list) uploaded.push(await uploadImage(f));

      let current: any[] = [];
      try {
        const parsed = form.itemsJson ? JSON.parse(form.itemsJson) : [];
        current = Array.isArray(parsed) ? parsed : [];
      } catch {
        current = [];
      }

      const base = current.length;
      const next = [
        ...current,
        ...uploaded.map((url, idx) => ({ imageUrl: url, caption: '', sortOrder: base + idx })),
      ];
      setForm((p) => ({ ...p, itemsJson: JSON.stringify(next, null, 2) }));
      toast.success('Foto berhasil ditambahkan ke items');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Gagal upload foto');
    } finally {
      setUploading(false);
    }
  };

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = form.itemsJson ? JSON.parse(form.itemsJson) : undefined;
      if (form.id) {
        await api.put(`/public-site/admin/galleries/${form.id}`, {
          title: form.title,
          description: form.description,
          isPublished: form.isPublished ?? false,
          items,
        });
        toast.success('Album diperbarui');
      } else {
        await api.post('/public-site/admin/galleries', {
          title: form.title,
          description: form.description,
          isPublished: form.isPublished ?? false,
          items,
        });
        toast.success('Album ditambahkan');
      }
      resetForm();
      mutate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'JSON item galeri tidak valid');
    }
  };

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteDescription = useMemo(() => 'Yakin ingin menghapus album galeri ini?', []);

  const openDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/public-site/admin/galleries/${deleteId}`);
      toast.success('Berhasil dihapus');
      setIsDeleteOpen(false);
      setDeleteId(null);
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Gagal menghapus');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Galeri</h1>
        <p className="text-slate-500 dark:text-zinc-400">Kelola album dan foto yang akan tampil di halaman publik.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-6">
        <form onSubmit={upsert} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Judul Album</Label>
            <Input value={form.title ?? ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
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
            <Label>Items (JSON array: [&#123;imageUrl, caption&#125;])</Label>
            <Textarea value={form.itemsJson ?? ''} onChange={(e) => setForm((p) => ({ ...p, itemsJson: e.target.value }))} className="min-h-[180px]" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Upload Foto untuk Items</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || !files.length) return;
                await appendItemsFromFiles(files);
                e.target.value = '';
              }}
            />
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
                <TableHead>Album</TableHead>
                <TableHead>Jumlah Foto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {galleries.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.title}</TableCell>
                  <TableCell>{g.items?.length ?? 0}</TableCell>
                  <TableCell>{g.is_published ? 'Publish' : 'Draft'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setForm({
                          id: g.id,
                          title: g.title,
                          description: g.description ?? '',
                          isPublished: g.is_published,
                          itemsJson: JSON.stringify(
                            (g.items ?? []).map((it) => ({
                              imageUrl: it.image_url,
                              caption: it.caption ?? '',
                              sortOrder: (it as any).sort_order ?? 0,
                            })),
                            null,
                            2
                          ),
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" type="button" onClick={() => openDelete(g.id)}>
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

