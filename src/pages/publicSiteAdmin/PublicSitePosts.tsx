import React, { useEffect, useMemo, useState } from 'react';
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
import type { PublicCategory, PublicPost, PublicPostType } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';
import { prepareImageForUpload } from '@/lib/imageUpload';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { Newspaper } from 'lucide-react';

export default function PublicSitePosts() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: categories = [], mutate: mutateCategories } = useSWR<PublicCategory[]>('/public-site/admin/categories', fetcher, { revalidateOnFocus: false });
  const [postType, setPostType] = useState<PublicPostType>('BERITA');
  const { data: posts = [], mutate: mutatePosts } = useSWR<PublicPost[]>(`/public-site/admin/posts?type=${postType}`, fetcher, { revalidateOnFocus: false });

  const [categoryForm, setCategoryForm] = useState<{ id?: string; name?: string; slug?: string }>({});
  const [postForm, setPostForm] = useState<{
    id?: string;
    type?: PublicPostType;
    title?: string;
    slug?: string;
    dateLabel?: string;
    status?: string;
    formUrl?: string;
    excerpt?: string;
    content?: string;
    coverImageUrl?: string;
    categoryId?: string;
    isPublished?: boolean;
  }>({ type: 'BERITA' });

  const resetCategoryForm = () => setCategoryForm({});
  const resetPostForm = () => setPostForm({ type: postType });

  useEffect(() => {
    resetPostForm();
  }, [postType]);

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, { maxBytes: 4 * 1024 * 1024, maxWidth: 1920, quality: 0.82 });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  };

  type DeleteKind = 'categories' | 'posts';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: DeleteKind; id: string } | null>(null);

  const openDelete = (kind: DeleteKind, id: string) => {
    setDeleteTarget({ kind, id });
    setIsDeleteOpen(true);
  };

  const deleteDescription = useMemo(() => {
    if (!deleteTarget) return '';
    const name = { categories: 'kategori', posts: 'konten' }[deleteTarget.kind];
    return `Yakin ingin menghapus ${name} ini?`;
  }, [deleteTarget]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'categories') await api.delete(`/public-site/admin/categories/${deleteTarget.id}`);
      if (deleteTarget.kind === 'posts') await api.delete(`/public-site/admin/posts/${deleteTarget.id}`);
      toast.success('Berhasil dihapus');
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      if (deleteTarget.kind === 'categories') mutateCategories();
      if (deleteTarget.kind === 'posts') mutatePosts();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal menghapus'));
    }
  };

  const upsertCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (categoryForm.id) {
        await api.put(`/public-site/admin/categories/${categoryForm.id}`, { name: categoryForm.name, slug: categoryForm.slug });
        toast.success('Kategori diperbarui');
      } else {
        await api.post('/public-site/admin/categories', { name: categoryForm.name, slug: categoryForm.slug });
        toast.success('Kategori ditambahkan');
      }
      resetCategoryForm();
      mutateCategories();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan kategori'));
    }
  };

  const upsertPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type: postForm.type ?? postType,
        title: postForm.title,
        slug: postForm.slug,
        dateLabel: postForm.dateLabel,
        status: postForm.status,
        formUrl: postForm.formUrl,
        excerpt: postForm.excerpt,
        content: postForm.content,
        coverImageUrl: postForm.coverImageUrl,
        categoryId: postForm.categoryId,
        isPublished: postForm.isPublished ?? false,
      };
      if (postForm.id) {
        await api.put(`/public-site/admin/posts/${postForm.id}`, payload);
        toast.success('Konten diperbarui');
      } else {
        await api.post('/public-site/admin/posts', payload);
        toast.success('Konten ditambahkan');
      }
      resetPostForm();
      mutatePosts();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan konten'));
    }
  };

  const typeLabel = useMemo(() => {
    return (
      {
        BERITA: 'Berita',
        KEGIATAN: 'Kegiatan',
        LOMBA: 'Informasi Lomba',
        PENGUMUMAN: 'Pengumuman',
      } as const
    )[postType];
  }, [postType]);

  return (
    <AdminPageShell
      title="Konten Publik"
      description="Kelola konten untuk halaman publik."
      variant="plain"
      icon={<Newspaper size={22} />}
      actions={
        <div className="w-full sm:w-[260px]">
          <Label>Jenis Konten</Label>
          <Select value={postType} onValueChange={(v) => setPostType(v as PublicPostType)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BERITA">Berita</SelectItem>
              <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
              <SelectItem value="LOMBA">Informasi Lomba</SelectItem>
              <SelectItem value="PENGUMUMAN">Pengumuman</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >

      <div className="grid gap-6 lg:grid-cols-2">
        {postType === 'BERITA' || postType === 'KEGIATAN' ? (
          <AdminCard title="Kategori" description="Dipakai untuk Berita dan Kegiatan.">
            <form onSubmit={upsertCategory} className="grid gap-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={categoryForm.name ?? ''} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Slug (opsional)</Label>
                <Input value={categoryForm.slug ?? ''} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="contoh: prestasi-mahasiswa" />
              </div>
              <div className="flex justify-end gap-3">
                {categoryForm.id ? (
                  <Button variant="outline" type="button" onClick={resetCategoryForm}>
                    Batal
                  </Button>
                ) : null}
                <Button type="submit">{categoryForm.id ? 'Update' : 'Tambah'}</Button>
              </div>
            </form>

            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.slug}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setCategoryForm({ id: c.id, name: c.name, slug: c.slug })}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" type="button" onClick={() => openDelete('categories', c.id)}>
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AdminCard>
        ) : (
          <AdminCard title={typeLabel} description="Kategori tidak digunakan untuk jenis konten ini.">
            <div className="text-sm text-slate-600 dark:text-zinc-300">Kategori tidak digunakan untuk jenis konten ini.</div>
          </AdminCard>
        )}

        <AdminCard title="Konten" description="Tambah atau ubah data konten.">
          <form onSubmit={upsertPost} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={postForm.type ?? postType} onValueChange={(v) => setPostForm((p) => ({ ...p, type: v as PublicPostType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BERITA">Berita</SelectItem>
                  <SelectItem value="KEGIATAN">Kegiatan</SelectItem>
                  <SelectItem value="LOMBA">Informasi Lomba</SelectItem>
                  <SelectItem value="PENGUMUMAN">Pengumuman</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Judul</Label>
              <Input value={postForm.title ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Slug (opsional)</Label>
              <Input value={postForm.slug ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, slug: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Label</Label>
              <Input value={postForm.dateLabel ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, dateLabel: e.target.value }))} placeholder="contoh: 7 Mei 2026" />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={postForm.categoryId ?? '__none__'}
                onValueChange={(v) => setPostForm((p) => ({ ...p, categoryId: v === '__none__' ? undefined : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-</SelectItem>
                  {categories
                    .filter((c) => Boolean(c?.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status (opsional)</Label>
              <Input value={postForm.status ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, status: e.target.value }))} placeholder="contoh: Buka / Tutup" />
            </div>
            {postForm.type === 'LOMBA' ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Link Pendaftaran (opsional)</Label>
                <Input
                  value={postForm.formUrl ?? ''}
                  onChange={(e) => setPostForm((p) => ({ ...p, formUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Publik</Label>
              <Select value={(postForm.isPublished ?? false) ? 'true' : 'false'} onValueChange={(v) => setPostForm((p) => ({ ...p, isPublished: v === 'true' }))}>
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
              <Label>Ringkas</Label>
              <Textarea value={postForm.excerpt ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, excerpt: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Konten</Label>
              <Textarea value={postForm.content ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))} className="min-h-[160px]" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Cover Image URL</Label>
              <Input value={postForm.coverImageUrl ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, coverImageUrl: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Upload Cover</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadImage(file);
                    setPostForm((p) => ({ ...p, coverImageUrl: url }));
                    toast.success('Upload berhasil');
                  } catch (err: any) {
                    toast.error(getErrorMessage(err, 'Gagal upload'));
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              {postForm.id ? (
                <Button variant="outline" type="button" onClick={resetPostForm}>
                  Batal
                </Button>
              ) : null}
              <Button type="submit">{postForm.id ? 'Update' : 'Tambah'}</Button>
            </div>
          </form>
        </AdminCard>
      </div>

      <AdminCard title="Daftar Konten" description="Klik Edit untuk mengisi form dari data yang sudah ada.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell>{p.category?.name ?? '-'}</TableCell>
                <TableCell>{p.date_label ?? '-'}</TableCell>
                <TableCell>{p.is_published ? 'Publish' : 'Draft'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setPostForm({
                        id: p.id,
                        type: p.type,
                        title: p.title,
                        slug: p.slug,
                        dateLabel: p.date_label ?? '',
                        status: p.status ?? '',
                        formUrl: p.form_url ?? '',
                        excerpt: p.excerpt ?? '',
                        content: p.content ?? '',
                        coverImageUrl: p.cover_image_url ?? '',
                        categoryId: p.category_id ?? undefined,
                        isPublished: p.is_published,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" type="button" onClick={() => openDelete('posts', p.id)}>
                    Hapus
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

