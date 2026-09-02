import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PublicCategory, PublicPost, PublicPostType } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { prepareImageForUpload } from '@/lib/media/imageUpload';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { Newspaper } from 'lucide-react';
import { CmsTabNav, type CmsTabItem } from '@/components/ui/CmsTabNav';
import { CmsPublishTabs } from '@/components/ui/CmsPublishTabs';
import PublicSitePostPreview from '@/components/publicSiteAdmin/PublicSitePostPreview';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { CmsCollapsibleSection } from '@/components/cms/CmsCollapsibleSection';
import { CmsListToolbar } from '@/components/cms/CmsListToolbar';
import { AdminContentTransition } from '@/components/admin/AdminContentTransition';
import { slugify } from '@/lib/utils/slugify';
import { useMutationToast } from '@/hooks/useMutationToast';

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
  const { data: categories = [], mutate: mutateCategories } = useSWR<PublicCategory[]>(
    '/public-site/admin/categories',
    fetcher,
    { revalidateOnFocus: false }
  );
  const [postType, setPostType] = useState<PublicPostType>('BERITA');
  const [contentTab, setContentTab] = useState<ContentTab>('list');
  const { data: posts = [], mutate: mutatePosts } = useSWR<PublicPost[]>(
    `/public-site/admin/posts?type=${postType}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [categoryForm, setCategoryForm] = useState<{ id?: string; name?: string; slug?: string }>(
    {}
  );
  const [categorySlugEdited, setCategorySlugEdited] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);
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
  const [postSlugEdited, setPostSlugEdited] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  const resetCategoryForm = useCallback(() => {
    setCategoryForm({});
    setCategorySlugEdited(false);
  }, []);
  const resetPostForm = useCallback(() => {
    setPostForm({ type: postType });
    setPostSlugEdited(false);
  }, [postType]);

  useEffect(() => {
    resetPostForm();
    setContentTab('list');
  }, [postType, resetPostForm]);

  useEffect(() => {
    setPostForm((p) => ({ ...p, type: postType }));
  }, [postType]);

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, {
      maxBytes: 4 * 1024 * 1024,
      maxWidth: 1920,
      quality: 0.82,
    });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url as string;
  };

  type DeleteKind = 'categories' | 'posts';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: DeleteKind; id: string } | null>(null);

  const doUpsertCategory = useMutationToast(
    async () => {
      const finalSlug = slugify(categoryForm.slug ?? '');
      if (categoryForm.id) {
        return api.put(`/public-site/admin/categories/${categoryForm.id}`, {
          name: categoryForm.name,
          slug: finalSlug,
        });
      }
      return api.post('/public-site/admin/categories', {
        name: categoryForm.name,
        slug: finalSlug,
      });
    },
    {
      successMsg: categoryForm.id ? 'Kategori diperbarui' : 'Kategori ditambahkan',
      errorMsg: (err) => getErrorMessage(err, 'Gagal menyimpan kategori'),
    }
  );

  const doUpsertPost = useMutationToast(
    async () => {
      const finalSlug = slugify(postForm.slug ?? '');
      const payload = {
        type: postForm.type ?? postType,
        title: postForm.title,
        slug: finalSlug,
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
        return api.put(`/public-site/admin/posts/${postForm.id}`, payload);
      }
      return api.post('/public-site/admin/posts', payload);
    },
    {
      successMsg: postForm.id ? 'Konten diperbarui' : 'Konten ditambahkan',
      errorMsg: (err) => getErrorMessage(err, 'Gagal menyimpan konten'),
    }
  );

  const doDelete = useMutationToast(
    async () => {
      if (!deleteTarget) return undefined as unknown as void;
      if (deleteTarget.kind === 'categories')
        return api.delete(`/public-site/admin/categories/${deleteTarget.id}`);
      if (deleteTarget.kind === 'posts')
        return api.delete(`/public-site/admin/posts/${deleteTarget.id}`);
      return undefined as unknown as void;
    },
    {
      successMsg: 'Berhasil dihapus',
      errorMsg: (err) => getErrorMessage(err, 'Gagal menghapus'),
    }
  );

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
    const currentKind = deleteTarget.kind;
    const result = await doDelete();
    if (result !== undefined) {
      setIsDeleteOpen(false);
      if (currentKind === 'categories') mutateCategories();
      if (currentKind === 'posts') mutatePosts();
      setDeleteTarget(null);
    }
  };

  const upsertCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSlug = slugify(categoryForm.slug ?? '');
    const isDuplicate = categories.some((c) => c.slug === finalSlug && c.id !== categoryForm.id);
    if (isDuplicate) {
      toast.error('Slug sudah digunakan, silakan gunakan slug lain');
      return;
    }

    setSubmittingCat(true);
    try {
      const result = await doUpsertCategory();
      if (result !== undefined) {
        resetCategoryForm();
        mutateCategories();
      }
    } finally {
      setSubmittingCat(false);
    }
  };

  const upsertPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSlug = slugify(postForm.slug ?? '');
    const isDuplicate = posts.some((p) => p.slug === finalSlug && p.id !== postForm.id);
    if (isDuplicate) {
      toast.error('Slug sudah digunakan, silakan gunakan slug lain');
      return;
    }

    setSubmittingPost(true);
    try {
      const result = await doUpsertPost();
      if (result !== undefined) {
        resetPostForm();
        setContentTab('list');
        mutatePosts();
      }
    } finally {
      setSubmittingPost(false);
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
    setPostSlugEdited(true);
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
              <CmsCollapsibleSection
                title="Kelola kategori"
                description="Opsional — untuk pengelompokan di halaman publik."
              >
                <form onSubmit={upsertCategory} className="grid max-w-xl gap-4">
                  <FormField id="ps-category-name" label="Nama">
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        value={categoryForm.name ?? ''}
                        onChange={(e) => {
                          const name = e.target.value;
                          setCategoryForm((p) => {
                            const newSlug = !categorySlugEdited ? slugify(name) : p.slug;
                            return { ...p, name, slug: newSlug };
                          });
                        }}
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                  <FormField
                    id="ps-category-slug"
                    label="Slug (opsional)"
                    description="contoh: prestasi-mahasiswa"
                  >
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        value={categoryForm.slug ?? ''}
                        onChange={(e) => {
                          setCategorySlugEdited(true);
                          setCategoryForm((p) => ({ ...p, slug: e.target.value }));
                        }}
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    {categoryForm.id ? (
                      <Button
                        variant="outline"
                        type="button"
                        className="min-h-11"
                        onClick={resetCategoryForm}
                      >
                        Batal
                      </Button>
                    ) : null}
                    <SubmitButton
                      type="submit"
                      className="min-h-11"
                      isLoading={submittingCat}
                      disabled={submittingCat}
                      label={categoryForm.id ? 'Simpan kategori' : 'Tambah kategori'}
                    />
                  </div>
                </form>
                {categories.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm" aria-label="Daftar kategori">
                    {categories.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 border-border"
                      >
                        <span>
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground"> · {c.slug}</span>
                        </span>
                        <span className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() =>
                              setCategoryForm({ id: c.id, name: c.name, slug: c.slug })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-red-600"
                            onClick={() => openDelete('categories', c.id)}
                          >
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
                  <span className="text-sm text-muted-foreground">Jenis:</span>
                  <Badge variant="secondary">{typeLabel}</Badge>
                </div>
                <FormField id="ps-post-title" label="Judul">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={postForm.title ?? ''}
                      onChange={(e) => {
                        const title = e.target.value;
                        setPostForm((p) => {
                          const newSlug = !postSlugEdited ? slugify(title) : p.slug;
                          return { ...p, title, slug: newSlug };
                        });
                      }}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="ps-post-slug" label="Slug (opsional)">
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        value={postForm.slug ?? ''}
                        onChange={(e) => {
                          setPostSlugEdited(true);
                          setPostForm((p) => ({ ...p, slug: e.target.value }));
                        }}
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                  <FormField id="ps-post-datelabel" label="Tanggal label">
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        value={postForm.dateLabel ?? ''}
                        onChange={(e) => setPostForm((p) => ({ ...p, dateLabel: e.target.value }))}
                        placeholder="7 Mei 2026"
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                </div>
                {(postType === 'BERITA' || postType === 'KEGIATAN') && (
                  <FormField id="ps-post-category" label="Kategori konten">
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Select
                        value={postForm.categoryId ?? '__none__'}
                        onValueChange={(v) =>
                          setPostForm((p) => ({
                            ...p,
                            categoryId: v === '__none__' ? undefined : v,
                          }))
                        }
                      >
                        <SelectTrigger
                          id={id}
                          aria-describedby={ariaDescribedBy}
                          aria-invalid={ariaInvalid}
                        >
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
                    )}
                  </FormField>
                )}
                <FormField id="ps-post-status" label="Status singkat (opsional)">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={postForm.status ?? ''}
                      onChange={(e) => setPostForm((p) => ({ ...p, status: e.target.value }))}
                      placeholder="Buka / Tutup"
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                {postType === 'LOMBA' ? (
                  <FormField id="ps-post-formurl" label="Link pendaftaran">
                    {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                      <Input
                        id={id}
                        value={postForm.formUrl ?? ''}
                        onChange={(e) => setPostForm((p) => ({ ...p, formUrl: e.target.value }))}
                        placeholder="https://..."
                        aria-describedby={ariaDescribedBy}
                        aria-invalid={ariaInvalid}
                      />
                    )}
                  </FormField>
                ) : null}
                <FormField id="ps-post-publish" label="Status publikasi">
                  {({ 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <CmsPublishTabs
                      published={postForm.isPublished ?? false}
                      onChange={(v) => setPostForm((p) => ({ ...p, isPublished: v }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="ps-post-excerpt" label="Ringkasan">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      rows={3}
                      value={postForm.excerpt ?? ''}
                      onChange={(e) => setPostForm((p) => ({ ...p, excerpt: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="ps-post-content" label="Konten">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Textarea
                      id={id}
                      rows={8}
                      value={postForm.content ?? ''}
                      onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))}
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="ps-post-coverurl" label="URL cover">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
                      value={postForm.coverImageUrl ?? ''}
                      onChange={(e) =>
                        setPostForm((p) => ({ ...p, coverImageUrl: e.target.value }))
                      }
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <FormField id="ps-post-coverupload" label="Upload cover">
                  {({ id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) => (
                    <Input
                      id={id}
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
                      aria-describedby={ariaDescribedBy}
                      aria-invalid={ariaInvalid}
                    />
                  )}
                </FormField>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setContentTab('list')}
                  >
                    Kembali ke daftar
                  </Button>
                  {postForm.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11"
                      onClick={resetPostForm}
                    >
                      Reset form
                    </Button>
                  ) : null}
                  <SubmitButton
                    type="submit"
                    className="min-h-11"
                    isLoading={submittingPost}
                    disabled={submittingPost}
                    label={postForm.id ? 'Simpan perubahan' : 'Terbitkan ke daftar'}
                  />
                </div>
              </form>
            </AdminCard>
          </CmsEditorLayout>
        </AdminContentTransition>
      ) : (
        <AdminContentTransition contentKey={`list-${postType}`}>
          <AdminCard
            title={`Daftar ${typeLabel}`}
            description="Pilih baris untuk mengedit, atau buat konten baru."
          >
            <CmsListToolbar
              count={posts.length}
              countLabel={typeLabel.toLowerCase()}
              onCreate={() => {
                resetPostForm();
                setContentTab('edit');
              }}
            />
            <ul className="space-y-4 md:hidden" aria-label="Daftar konten">
              {posts.length === 0 ? (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada konten.
                </li>
              ) : null}
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl border border-border p-4 border-border">
                  <p className="font-bold text-foreground">{p.title}</p>
                  <p className="text-sm text-muted-foreground">{p.category?.name ?? p.type}</p>
                  <Badge className="mt-2" variant={p.is_published ? 'success' : 'secondary'}>
                    {p.is_published ? 'Publik' : 'Draft'}
                  </Badge>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 flex-1"
                      type="button"
                      onClick={() => loadPostForEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="min-h-11"
                      type="button"
                      onClick={() => openDelete('posts', p.id)}
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
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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
                        <Badge variant={p.is_published ? 'success' : 'secondary'}>
                          {p.is_published ? 'Publik' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => loadPostForEdit(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={() => openDelete('posts', p.id)}
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
