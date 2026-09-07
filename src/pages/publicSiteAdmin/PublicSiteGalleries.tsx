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
import type { PublicGalleryAlbum } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { prepareImageForUpload } from '@/lib/media/imageUpload';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import PublicSiteGalleryPreview from '@/components/publicSiteAdmin/PublicSiteGalleryPreview';
import { Image } from 'lucide-react';
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

export default function PublicSiteGalleries() {
  const formId = React.useId();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: galleries = [], mutate } = useSWR<PublicGalleryAlbum[]>(
    '/public-site/admin/galleries',
    fetcher,
    { revalidateOnFocus: false }
  );

  const [pageTab, setPageTab] = useState<PageTab>('list');
  type ItemDraft = { imageUrl: string; caption: string };
  const [form, setForm] = useState<{
    id?: string;
    title?: string;
    description?: string;
    isPublished?: boolean;
    items?: ItemDraft[];
  }>({ items: [] });
  const [dirty, setDirty] = useState(false);
  const { confirmIfDirty } = useFormDirtyGuard(dirty);

  const setFormDirty = useMemo(
    () => (updater: React.SetStateAction<typeof form>) => {
      setDirty(true);
      setFormDirty(updater);
    },
    []
  );
  const resetForm = () => {
    setForm({ items: [] });
    setDirty(false);
  };

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, {
      maxBytes: 4 * 1024 * 1024,
      maxWidth: 1600,
      quality: 0.82,
    });
    const fd = new FormData();
    fd.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', fd);
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
      setFormDirty((p) => ({
        ...p,
        items: [...(p.items ?? []), ...uploaded.map((url) => ({ imageUrl: url, caption: '' }))],
      }));
      toast.success('Foto berhasil ditambahkan');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal upload foto'));
    } finally {
      setUploading(false);
    }
  };

  const upsert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const items = (form.items ?? []).map((x, idx) => ({
        imageUrl: x.imageUrl,
        caption: x.caption,
        sortOrder: idx,
      }));
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
      setPageTab('list');
      mutate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan'));
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
      toast.error(getErrorMessage(e, 'Gagal menghapus'));
    }
  };

  return (
    <AdminPageShell
      title="Galeri"
      description="Kelola album dan foto yang akan tampil di halaman publik."
      variant="plain"
      icon={<Image size={22} />}
    >
      <CmsTabNav<PageTab>
        tabs={PAGE_TABS}
        value={pageTab}
        onChange={async (next) => {
          const ok = await confirmIfDirty();
          if (ok) setPageTab(next);
        }}
        ariaLabel="Mode galeri"
      />

      {pageTab === 'form' ? (
        <AdminContentTransition contentKey={`form-${form.id ?? 'new'}`}>
          <CmsEditorLayout
            preview={
              <PublicSiteGalleryPreview
                title={form.title}
                description={form.description}
                isPublished={form.isPublished}
                items={form.items}
              />
            }
          >
            <AdminCard
              title={form.id ? 'Ubah album' : 'Album baru'}
              description="Judul, foto, dan status publikasi."
            >
              <form onSubmit={upsert} className="space-y-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`${formId}-album-title`}>Judul Album</Label>
                  <Input
                    id={`${formId}-album-title`}
                    value={form.title ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Status publikasi</Label>
                  <CmsPublishTabs
                    published={form.isPublished ?? false}
                    onChange={(v) => setFormDirty((p) => ({ ...p, isPublished: v }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`${formId}-album-description`}>Deskripsi</Label>
                  <Textarea
                    id={`${formId}-album-description`}
                    value={form.description ?? ''}
                    onChange={(e) => setFormDirty((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label>Items Foto</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() =>
                        setFormDirty((p) => ({
                          ...p,
                          items: [...(p.items ?? []), { imageUrl: '', caption: '' }],
                        }))
                      }
                    >
                      Tambah Manual
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-album-upload`}>Upload Foto</Label>
                    <Input
                      id={`${formId}-album-upload`}
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

                  {(form.items ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Belum ada foto. Upload atau klik “Tambah Manual”.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {(form.items ?? []).map((it, idx) => (
                        <div key={idx} className="rounded-xl border border-border bg-muted/30 p-3">
                          <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100 bg-background">
                            {it.imageUrl ? (
                              <img
                                src={it.imageUrl}
                                alt="Foto"
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const el = document.getElementById(
                                    `${formId}-item-url-toggle-${idx}`
                                  );
                                  el?.classList.toggle('hidden');
                                }}
                              >
                                Masukkan URL manual
                              </Button>
                            </div>
                            <div
                              id={`${formId}-item-url-toggle-${idx}`}
                              className="hidden space-y-2"
                            >
                              <Label
                                htmlFor={`${formId}-item-url-${idx}`}
                                className="text-xs text-muted-foreground"
                              >
                                URL gambar item {idx + 1}
                              </Label>
                              <Input
                                id={`${formId}-item-url-${idx}`}
                                value={it.imageUrl}
                                onChange={(e) =>
                                  setFormDirty((p) => ({
                                    ...p,
                                    items: (p.items ?? []).map((x, i) =>
                                      i === idx ? { ...x, imageUrl: e.target.value } : x
                                    ),
                                  }))
                                }
                                placeholder="Image URL"
                              />
                            </div>
                            <Label htmlFor={`${formId}-item-caption-${idx}`} className="sr-only">
                              Caption item {idx + 1}
                            </Label>
                            <Input
                              id={`${formId}-item-caption-${idx}`}
                              value={it.caption}
                              onChange={(e) =>
                                setFormDirty((p) => ({
                                  ...p,
                                  items: (p.items ?? []).map((x, i) =>
                                    i === idx ? { ...x, caption: e.target.value } : x
                                  ),
                                }))
                              }
                              placeholder="Caption (opsional)"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11 w-full"
                              onClick={() =>
                                setFormDirty((p) => ({
                                  ...p,
                                  items: (p.items ?? []).filter((_, i) => i !== idx),
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
                  <Button type="submit" className="min-h-11" disabled={uploading}>
                    {form.id ? 'Simpan album' : 'Tambah album'}
                  </Button>
                </div>
              </form>
            </AdminCard>
          </CmsEditorLayout>
        </AdminContentTransition>
      ) : (
        <AdminContentTransition contentKey="list-galleries">
          <AdminCard title="Daftar album" description="Kelola album galeri publik.">
            <CmsListToolbar
              count={galleries.length}
              countLabel="album"
              onCreate={async () => {
                const ok = await confirmIfDirty();
                if (!ok) return;
                resetForm();
                setPageTab('form');
              }}
            />
            <ul className="space-y-4 md:hidden" aria-label="Daftar album">
              {galleries.length === 0 ? (
                <li className="py-8 text-center text-sm text-muted-foreground">Belum ada album.</li>
              ) : null}
              {galleries.map((g) => (
                <li key={g.id} className="rounded-2xl border border-border p-4">
                  <p className="font-bold text-foreground">{g.title}</p>
                  <p className="text-sm text-muted-foreground">{g.items?.length ?? 0} foto</p>
                  <Badge className="mt-2" variant={g.is_published ? 'success' : 'secondary'}>
                    {g.is_published ? 'Publik' : 'Draft'}
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
                          id: g.id,
                          title: g.title,
                          description: g.description ?? '',
                          isPublished: g.is_published,
                          items: (g.items ?? []).map((it) => ({
                            imageUrl: it.image_url,
                            caption: it.caption ?? '',
                          })),
                        });
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
                      onClick={() => openDelete(g.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Album</TableHead>
                    <TableHead>Jumlah Foto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {galleries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Belum ada album.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {galleries.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.title}</TableCell>
                      <TableCell>{g.items?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={g.is_published ? 'success' : 'secondary'}>
                          {g.is_published ? 'Publik' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={async () => {
                            const ok = await confirmIfDirty();
                            if (!ok) return;
                            setForm({
                              id: g.id,
                              title: g.title,
                              description: g.description ?? '',
                              isPublished: g.is_published,
                              items: (g.items ?? []).map((it) => ({
                                imageUrl: it.image_url,
                                caption: it.caption ?? '',
                              })),
                            });
                            setDirty(false);
                            setPageTab('form');
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={() => openDelete(g.id)}
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
