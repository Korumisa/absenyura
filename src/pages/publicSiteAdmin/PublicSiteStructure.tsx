import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { PublicStructureGroup } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/errorMessage';
import { prepareImageForUpload } from '@/lib/imageUpload';
import { ConfirmModal } from '@/components/ConfirmModal';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { Layers } from 'lucide-react';

export default function PublicSiteStructure() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: structure = [], mutate } = useSWR<PublicStructureGroup[]>('/public-site/admin/structure', fetcher, { revalidateOnFocus: false });

  type MemberDraft = { name: string; role: string; photoUrl: string; isSpotlight: boolean };
  type GroupDraft = { title: string; isCore: boolean; people: MemberDraft[] };
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  useEffect(() => {
    const mapped: GroupDraft[] = (structure ?? []).map((g) => ({
      title: g.title ?? '',
      isCore: Boolean((g as any).is_core ?? false),
      people: (g.members ?? []).map((m) => ({
        name: m.name ?? '',
        role: m.role ?? '',
        photoUrl: m.photo_url ?? '',
        isSpotlight: Boolean((m as any).is_spotlight ?? false),
      })),
    }));
    setGroups(mapped);
  }, [structure]);

  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm?: () => void;
  }>({ open: false, title: '', description: '' });

  const uploadImage = async (file: File) => {
    const prepared = await prepareImageForUpload(file, { maxBytes: 4 * 1024 * 1024, maxWidth: 1200, quality: 0.82 });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.data.url as string;
  };

  const onPickMemberPhoto = async (gi: number, pi: number, file: File) => {
    const key = `${gi}:${pi}`;
    setUploadingKey(key);
    try {
      const url = await uploadImage(file);
      setGroups((prev) =>
        prev.map((g, gidx) =>
          gidx === gi ? { ...g, people: g.people.map((p, pidx) => (pidx === pi ? { ...p, photoUrl: url } : p)) } : g
        )
      );
      toast.success('Upload foto anggota berhasil');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal upload foto'));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = groups.map((g, gi) => ({
        title: g.title,
        isCore: g.isCore,
        sortOrder: gi,
        people: (g.people ?? []).map((p, pi) => ({
          name: p.name,
          role: p.role,
          photoUrl: p.photoUrl,
          isSpotlight: p.isSpotlight,
          sortOrder: pi,
        })),
      }));
      await api.put('/public-site/admin/structure', { data: payload });
      toast.success('Struktur organisasi tersimpan');
      mutate();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const mapped: GroupDraft[] = (structure ?? []).map((g) => ({
      title: g.title ?? '',
      isCore: Boolean((g as any).is_core ?? false),
      people: (g.members ?? []).map((m) => ({
        name: m.name ?? '',
        role: m.role ?? '',
        photoUrl: m.photo_url ?? '',
        isSpotlight: Boolean((m as any).is_spotlight ?? false),
      })),
    }));
    setGroups(mapped);
  };

  return (
    <AdminPageShell title="Struktur Organisasi" description="Tambahkan grup dan anggota tanpa perlu JSON." variant="plain" icon={<Layers size={22} />}>
      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm((prev) => ({ ...prev, open: false }))}
        onConfirm={() => {
          confirm.onConfirm?.();
          setConfirm((prev) => ({ ...prev, open: false }));
        }}
        title={confirm.title}
        description={confirm.description}
        confirmText={confirm.confirmText}
        cancelText="Batal"
        variant={confirm.variant}
      />

      <AdminCard
        title="Grup Struktur"
        description="Atur grup, tandai divisi inti, lalu tentukan spotlight per grup."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setGroups((prev) => [...prev, { title: '', isCore: false, people: [{ name: '', role: '', photoUrl: '', isSpotlight: false }] }])
            }
          >
            Tambah Grup
          </Button>
        }
      >

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            Belum ada struktur. Klik “Tambah Grup” untuk mulai.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="w-full space-y-2">
                    <Label>Nama Grup</Label>
                    <Input
                      value={g.title}
                      onChange={(e) =>
                        setGroups((prev) =>
                          prev.map((x, idx) => (idx === gi ? { ...x, title: e.target.value } : x))
                        )
                      }
                      placeholder="Contoh: INTI"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={Boolean(g.isCore)}
                        onChange={(e) =>
                          setGroups((prev) => prev.map((x, idx) => (idx === gi ? { ...x, isCore: e.target.checked } : x)))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:text-indigo-400 dark:focus:ring-indigo-400"
                      />
                      Divisi inti
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setGroups((prev) =>
                          prev.map((x, idx) =>
                            idx === gi ? { ...x, people: [...x.people, { name: '', role: '', photoUrl: '', isSpotlight: false }] } : x
                          )
                        )
                      }
                    >
                      Tambah Anggota
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() =>
                        setConfirm({
                          open: true,
                          title: 'Hapus grup ini?',
                          description: 'Semua anggota di dalam grup ini juga akan ikut terhapus.',
                          confirmText: 'Hapus Grup',
                          variant: 'danger',
                          onConfirm: () => setGroups((prev) => prev.filter((_, idx) => idx !== gi)),
                        })
                      }
                    >
                      Hapus Grup
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Foto</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Nama</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Jabatan</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Spotlight</div>
                  </div>
                  {g.people.map((p, pi) => (
                    <div key={pi} className="grid gap-3 md:grid-cols-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900">
                          {p.photoUrl ? <img src={p.photoUrl} alt="Foto" className="h-full w-full object-cover" /> : null}
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={saving || uploadingKey === `${gi}:${pi}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            onPickMemberPhoto(gi, pi, file);
                            e.currentTarget.value = '';
                          }}
                        />
                      </div>
                      <Input
                        value={p.name}
                        onChange={(e) =>
                          setGroups((prev) =>
                            prev.map((x, idx) =>
                              idx === gi
                                ? { ...x, people: x.people.map((pp, pidx) => (pidx === pi ? { ...pp, name: e.target.value } : pp)) }
                                : x
                            )
                          )
                        }
                        placeholder="Nama"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={p.role}
                          onChange={(e) =>
                            setGroups((prev) =>
                              prev.map((x, idx) =>
                                idx === gi
                                  ? { ...x, people: x.people.map((pp, pidx) => (pidx === pi ? { ...pp, role: e.target.value } : pp)) }
                                  : x
                              )
                            )
                          }
                          placeholder="Jabatan"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setConfirm({
                              open: true,
                              title: 'Hapus anggota ini?',
                              description: 'Tindakan ini tidak bisa dibatalkan.',
                              confirmText: 'Hapus',
                              variant: 'danger',
                              onConfirm: () =>
                                setGroups((prev) =>
                                  prev.map((x, idx) =>
                                    idx === gi ? { ...x, people: x.people.filter((_, pidx) => pidx !== pi) } : x
                                  )
                                ),
                            })
                          }
                        >
                          Hapus
                        </Button>
                      </div>
                      <div className="flex items-center justify-start md:justify-center">
                        <input
                          type="checkbox"
                          checked={Boolean(p.isSpotlight)}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setGroups((prev) =>
                              prev.map((x, idx) =>
                                idx === gi
                                  ? {
                                      ...x,
                                      people: x.people.map((pp, pidx) =>
                                        pidx === pi ? { ...pp, isSpotlight: next } : { ...pp, isSpotlight: next ? false : pp.isSpotlight }
                                      ),
                                    }
                                  : x
                              )
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:text-indigo-400 dark:focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              setConfirm({
                open: true,
                title: 'Reset perubahan?',
                description: 'Semua perubahan yang belum disimpan akan dikembalikan ke data terakhir yang tersimpan.',
                confirmText: 'Reset',
                variant: 'primary',
                onConfirm: handleReset,
              })
            }
            disabled={saving}
          >
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            Simpan
          </Button>
        </div>
      </AdminCard>
    </AdminPageShell>
  );
}

