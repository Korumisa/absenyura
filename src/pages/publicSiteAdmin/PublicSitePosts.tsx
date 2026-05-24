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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PublicCategory, PublicPost, PublicPostType } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';
import { prepareImageForUpload } from '@/lib/imageUpload';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { Newspaper } from 'lucide-react';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsPublishTabs } from '@/components/ui/CmsPublishTabs';
import { MobileTableHint } from '@/components/ui/MobileTableHint';
import PublicSitePostPreview from '@/components/publicSiteAdmin/PublicSitePostPreview';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { CmsCollapsibleSection } from '@/components/cms/CmsCollapsibleSection';
import { CmsListToolbar } from '@/components/cms/CmsListToolbar';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';

const POST_TYPE_TABS: readonly CmsTabItem<PublicPostType>[] = [
  { id: 'BERITA', label: 'Berita' },
  { id: 'KEGIATAN', label: 'Kegiatan' },
  { id: 'LOMBA', label: 'Lomba' },
  { id: 'PENGUMUMAN', label: 'Pengumuman' },
];

type ContentTab = 'edit' | 'list';
const CONTENT_TABS: readonly CmsTabItem<ContentTab>[] = [
  { id: 'list', label: 'Daftar' },
  { id: 'edit', label: 'Editor' },
];

export default function PublicSitePosts() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: categories = [], mutate: mutateCategories } = useSWR<PublicCategory[]>('/public-site/admin/categories', fetcher, { revalidateOnFocus: false });
  const [postType, setPostType] = useState<PublicPostType>('BERITA');
  const [contentTab, setContentTab] = useState<ContentTab>('list');
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
    setContentTab('list');
  }, [postType]);

  useEffect(() => {
    setPostForm((p) => ({ ...p, type: postType }));
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
      setContentTab('list');
      mutatePosts();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan konten'));
    }
  };

  const loadPostForEdit = (p: PublicPost) => {
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
      categoryId: p.category_id ?? p.category?.id,
      isPublished: p.is_published,
    });
    setContentTab('edit');
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
    >
      <CmsTabNav<PublicPostType>
        tabs={POST_TYPE_TABS}
        value={postType}
        onChange={setPostType}
        ariaLabel="Jenis konten publik"
      />

      <CmsTabNav<ContentTab>
        tabs={CONTENT_TABS}
        value={contentTab}
        onChange={setContentTab}
        ariaLabel="Mode konten"
      />

      {contentTab === 'edit' ? (
        <AdminContentTransition contentKey={`edit-${postType}-${postForm.id ?? 'new'}`}>
          <CmsEditorLayout
            preview={
              <PublicSitePostPreview
                type={postType}
                title={postForm.title}
                excerpt={postForm.excerpt}
                dateLabel={postForm.dateLabel}
                coverImageUrl={postForm.coverImageUrl}
                isPublished={postForm.isPublished}
              />
            }
          >
            {postType === 'BERITA' || postType === 'KEGIATAN' ? (
              <CmsCollapsibleSection title="Kelola kategori" description="Opsional — untuk pengelompokan di halaman publik.">
                <form onSubmit={upsertCategory} className="grid max-w-xl gap-4">
                  <div className="space-y-2">
                    <Label>Nama</Label>
                    <Input value={categoryForm.name ?? ''} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (opsional)</Label>
                    <Input value={categoryForm.slug ?? ''} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="contoh: prestasi-mahasiswa" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categoryForm.id ? (
                      <Button variant="outline" type="button" className="min-h-11" onClick={resetCategoryForm}>
                        Batal
                      </Button>
                    ) : null}
                    <Button type="submit" className="min-h-11">
                      {categoryForm.id ? 'Simpan kategori' : 'Tambah kategori'}
                    </Button>
                  </div>
                </form>
                {categories.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm" aria-label="Daftar kategori">
                    {categories.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-700">
                        <span>
                          <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                          <span className="text-slate-500"> · {c.slug}</span>
                        </span>
                        <span className="flex gap-1">
                          <Button variant="ghost" size="sm" type="button" onClick={() => setCategoryForm({ id: c.id, name: c.name, slug: c.slug })}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" type="button" className="text-red-600" onClick={() => openDelete('categories', c.id)}>
                            Hapus
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CmsCollapsibleSection>
            ) : null}

            <AdminCard
              title={postForm.id ? `Ubah ${typeLabel}` : `Tulis ${typeLabel}`}
              description="Isi form lalu simpan. Pratinjau tampilan publik ada di samping."
            >
              <form onSubmit={upsertPost} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Jenis:</span>
                  <Badge variant="secondary">{typeLabel}</Badge>
                </div>
                <div className="space-y-2">
                  <Label>Judul</Label>
                  <Input value={postForm.title ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Slug (opsional)</Label>
                    <Input value={postForm.slug ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, slug: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal label</Label>
                    <Input value={postForm.dateLabel ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, dateLabel: e.target.value }))} placeholder="7 Mei 2026" />
                  </div>
                </div>
                {(postType === 'BERITA' || postType === 'KEGIATAN') && (
                  <div className="space-y-2">
                    <Label>Kategori konten</Label>
                    <Select
                      value={postForm.categoryId ?? '__none__'}
                      onValueChange={(v) => setPostForm((p) => ({ ...p, categoryId: v === '__none__' ? undefined : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Tanpa kategori</SelectItem>
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
                )}
                <div className="space-y-2">
                  <Label>Status singkat (opsional)</Label>
                  <Input value={postForm.status ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, status: e.target.value }))} placeholder="Buka / Tutup" />
                </div>
                {postType === 'LOMBA' ? (
                  <div className="space-y-2">
                    <Label>Link pendaftaran</Label>
                    <Input value={postForm.formUrl ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, formUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Status publikasi</Label>
                  <CmsPublishTabs published={postForm.isPublished ?? false} onChange={(v) => setPostForm((p) => ({ ...p, isPublished: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>Ringkasan</Label>
                  <Textarea rows={3} value={postForm.excerpt ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, excerpt: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Konten</Label>
                  <Textarea rows={8} value={postForm.content ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>URL cover</Label>
                  <Input value={postForm.coverImageUrl ?? ''} onChange={(e) => setPostForm((p) => ({ ...p, coverImageUrl: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Upload cover</Label>
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
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setContentTab('list')}>
                    Kembali ke daftar
                  </Button>
                  {postForm.id ? (
                    <Button type="button" variant="ghost" className="min-h-11" onClick={resetPostForm}>
                      Reset form
                    </Button>
                  ) : null}
                  <Button type="submit" className="min-h-11">
                    {postForm.id ? 'Simpan perubahan' : 'Terbitkan ke daftar'}
                  </Button>
                </div>
              </form>
            </AdminCard>
          </CmsEditorLayout>
        </AdminContentTransition>
      ) : (
        <AdminContentTransition contentKey={`list-${postType}`}>
          <AdminCard title={`Daftar ${typeLabel}`} description="Pilih baris untuk mengedit, atau buat konten baru.">
            <CmsListToolbar
              count={posts.length}
              countLabel={typeLabel.toLowerCase()}
              onCreate={() => {
                resetPostForm();
                setContentTab('edit');
              }}
            />
        <ul className="space-y-3 md:hidden" aria-label="Daftar konten">
          {posts.length === 0 ? (
            <li className="py-8 text-center text-sm text-slate-500">Belum ada konten.</li>
          ) : null}
          {posts.map((p) => (
            <li key={p.id} className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800">
              <p className="font-bold text-slate-900 dark:text-white">{p.title}</p>
              <p className="text-sm text-slate-500">{p.category?.name ?? p.type}</p>
              <Badge className="mt-2" variant={p.is_published ? 'success' : 'secondary'}>
                {p.is_published ? 'Publik' : 'Draft'}
              </Badge>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="min-h-11 flex-1" type="button" onClick={() => loadPostForEdit(p)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="min-h-11" type="button" onClick={() => openDelete('posts', p.id)}>
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
              <TableHead>Kategori</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                  Belum ada konten.
                </TableCell>
              </TableRow>
            ) : null}
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.category?.name ?? '-'}</TableCell>
                <TableCell>{p.date_label ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={p.is_published ? 'success' : 'secondary'}>{p.is_published ? 'Publik' : 'Draft'}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => loadPostForEdit(p)}>
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

