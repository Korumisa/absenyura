import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { PublicStructureGroup } from '@/types/publicSite';
import { getErrorMessage } from '@/lib/http/errorMessage';
import { prepareImageForUpload } from '@/lib/media/imageUpload';
import { ConfirmModal } from '@/components/ConfirmModal';
import AdminPageShell from '@/components/AdminPageShell';
import AdminCard from '@/components/AdminCard';
import { AdminCardActions } from '@/components/admin/AdminCardActions';
import PublicSiteStructurePreview from '@/components/publicSiteAdmin/PublicSiteStructurePreview';
import { CmsEditorLayout } from '@/components/cms/CmsEditorLayout';
import { Layers } from 'lucide-react';

export default function PublicSiteStructure() {
  const formId = React.useId();
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: adminData, mutate } = useSWR<{
    cabinets: any[];
    activeCabinetId: string;
    activeGroups: PublicStructureGroup[];
  }>('/public-site/admin/structure', fetcher, { revalidateOnFocus: false });

  type MemberDraft = { name: string; role: string; photoUrl: string; isSpotlight: boolean };
  type GroupDraft = { title: string; isCore: boolean; people: MemberDraft[] };
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [cabinetName, setCabinetName] = useState('');
  const [cabinetPeriod, setCabinetPeriod] = useState('');
  const [viewingCabinetId, setViewingCabinetId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const markDirty = () => {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
  };
  const setGroupsDirty = (updater: (prev: GroupDraft[]) => GroupDraft[]) => {
    markDirty();
    setGroups(updater);
  };

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (dirtyRef.current) return;
    if (!adminData) return;

    const cabinets = adminData.cabinets || [];
    const activeCabinet = cabinets.find((c: any) => c.is_active) || cabinets[0] || null;
    const currentViewCabinet = viewingCabinetId
      ? cabinets.find((c: any) => c.id === viewingCabinetId)
      : activeCabinet;

    if (currentViewCabinet) {
      const mapped: GroupDraft[] = (currentViewCabinet.groups ?? []).map((g: any) => ({
        title: g.title ?? '',
        isCore: Boolean(g.is_core ?? false),
        people: (g.members ?? []).map((m: any) => ({
          name: m.name ?? '',
          role: m.role ?? '',
          photoUrl: m.photo_url ?? '',
          isSpotlight: Boolean(m.is_spotlight ?? false),
        })),
      }));
      setGroups(mapped);
      setCabinetName(currentViewCabinet.name);
      setCabinetPeriod(currentViewCabinet.period);
    } else {
      // Default for new cabinet
      setCabinetName('');
      setCabinetPeriod(`${currentYear}/${currentYear + 1}`);
      setGroups([]);
    }
  }, [adminData, viewingCabinetId]);

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
    const prepared = await prepareImageForUpload(file, {
      maxBytes: 4 * 1024 * 1024,
      maxWidth: 1200,
      quality: 0.82,
    });
    const form = new FormData();
    form.append('file', prepared);
    const res = await api.post('/public-site/admin/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url as string;
  };

  const onPickMemberPhoto = async (gi: number, pi: number, file: File) => {
    const key = `${gi}:${pi}`;
    setUploadingKey(key);
    try {
      const url = await uploadImage(file);
      setGroupsDirty((prev) =>
        prev.map((g, gidx) =>
          gidx === gi
            ? {
                ...g,
                people: g.people.map((p, pidx) => (pidx === pi ? { ...p, photoUrl: url } : p)),
              }
            : g
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
      await api.put('/public-site/admin/structure', { cabinetName, cabinetPeriod, data: payload });
      toast.success('Struktur organisasi tersimpan');
      setViewingCabinetId(null); // Reset to new active cabinet after saving
      dirtyRef.current = false;
      setDirty(false);
      mutate();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.put(`/public-site/admin/structure/active/${id}`);
      toast.success('Kabinet aktif diubah');
      mutate();
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Gagal mengubah kabinet aktif'));
    }
  };

  const handleReset = () => {
    if (!adminData) return;
    const cabinets = adminData.cabinets || [];
    const activeCabinet = cabinets.find((c: any) => c.is_active) || cabinets[0] || null;
    const currentViewCabinet = viewingCabinetId
      ? cabinets.find((c: any) => c.id === viewingCabinetId)
      : activeCabinet;

    if (currentViewCabinet) {
      const mapped: GroupDraft[] = (currentViewCabinet.groups ?? []).map((g: any) => ({
        title: g.title ?? '',
        isCore: Boolean(g.is_core ?? false),
        people: (g.members ?? []).map((m: any) => ({
          name: m.name ?? '',
          role: m.role ?? '',
          photoUrl: m.photo_url ?? '',
          isSpotlight: Boolean(m.is_spotlight ?? false),
        })),
      }));
      setGroups(mapped);
      setCabinetName(currentViewCabinet.name);
      setCabinetPeriod(currentViewCabinet.period);
    }
    dirtyRef.current = false;
    setDirty(false);
  };

  return (
    <AdminPageShell
      title="Struktur Organisasi"
      description="Tambahkan grup dan anggota tanpa perlu JSON."
      variant="plain"
      icon={<Layers size={22} />}
    >
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

      <CmsEditorLayout preview={<PublicSiteStructurePreview groups={groups} />}>
        <AdminCard
          title="Grup Struktur"
          description="Atur grup, tandai divisi inti, lalu tentukan spotlight per anggota (maks 1 anggota per grup). Tips: buat grup bernama “Dosen Pembimbing” untuk tampil di atas INTI; untuk foto Visi/Misi di beranda, isi jabatan mengandung “Ketua” dan “Wakil”."
          actions={
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() =>
                setGroupsDirty((prev) => [
                  ...prev,
                  {
                    title: '',
                    isCore: false,
                    people: [{ name: '', role: '', photoUrl: '', isSpotlight: false }],
                  },
                ])
              }
            >
              Tambah Grup
            </Button>
          }
        >
          {/* Cabinet Info */}
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-cabinet-name`}>Nama Kabinet</Label>
              <Input
                id={`${formId}-cabinet-name`}
                value={cabinetName}
                onChange={(e) => {
                  markDirty();
                  setCabinetName(e.target.value);
                }}
                placeholder="Contoh: Kabinet Harmoni"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-cabinet-period`}>Periode</Label>
              <Input
                id={`${formId}-cabinet-period`}
                value={cabinetPeriod}
                onChange={(e) => {
                  markDirty();
                  setCabinetPeriod(e.target.value);
                }}
                placeholder={`Contoh: ${currentYear}/${currentYear + 1}`}
              />
            </div>
          </div>

          {/* Cabinet Selection */}
          {adminData?.cabinets && adminData.cabinets.length > 0 && (
            <div className="mb-6 border-b border-border pb-6">
              <Label className="mb-2 block">Lihat Kabinet Sebelumnya</Label>
              <div className="flex flex-wrap gap-2">
                {adminData.cabinets.map((cabinet: any) => (
                  <div key={cabinet.id} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={
                        viewingCabinetId === cabinet.id || (!viewingCabinetId && cabinet.is_active)
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() =>
                        setViewingCabinetId(viewingCabinetId === cabinet.id ? null : cabinet.id)
                      }
                    >
                      {cabinet.name} ({cabinet.period}){cabinet.is_active && ' (Aktif)'}
                    </Button>
                    {!cabinet.is_active && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(cabinet.id)}
                      >
                        Jadikan Aktif
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Belum ada struktur. Klik “Tambah Grup” untuk mulai.
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g, gi) => (
                <div key={gi} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="w-full space-y-2">
                      <Label htmlFor={`${formId}-group-title-${gi}`}>Nama Grup</Label>
                      <Input
                        id={`${formId}-group-title-${gi}`}
                        value={g.title}
                        onChange={(e) =>
                          setGroupsDirty((prev) =>
                            prev.map((x, idx) => (idx === gi ? { ...x, title: e.target.value } : x))
                          )
                        }
                        placeholder="Contoh: INTI"
                      />
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          id={`${formId}-group-core-${gi}`}
                          checked={Boolean(g.isCore)}
                          onCheckedChange={(checked) =>
                            setGroupsDirty((prev) =>
                              prev.map((x, idx) =>
                                idx === gi ? { ...x, isCore: Boolean(checked) } : x
                              )
                            )
                          }
                        />
                        <Label htmlFor={`${formId}-group-core-${gi}`}>Divisi inti</Label>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          setGroupsDirty((prev) =>
                            prev.map((x, idx) =>
                              idx === gi
                                ? {
                                    ...x,
                                    people: [
                                      ...x.people,
                                      { name: '', role: '', photoUrl: '', isSpotlight: false },
                                    ],
                                  }
                                : x
                            )
                          )
                        }
                      >
                        Tambah Anggota
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          setConfirm({
                            open: true,
                            title: 'Hapus grup ini?',
                            description: 'Semua anggota di dalam grup ini juga akan ikut terhapus.',
                            confirmText: 'Hapus Grup',
                            variant: 'danger',
                            onConfirm: () =>
                              setGroupsDirty((prev) => prev.filter((_, idx) => idx !== gi)),
                          })
                        }
                      >
                        Hapus Grup
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="hidden grid gap-3 md:grid-cols-4 md:grid">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Foto
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nama
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Jabatan
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Spotlight
                      </div>
                    </div>
                    {g.people.map((p, pi) => (
                      <div
                        key={pi}
                        className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3 md:grid-cols-4 md:border-0 md:bg-transparent md:p-0"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="size-12 overflow-hidden rounded-full border border-border bg-muted">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt="Foto"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <Input
                            id={`structure-photo-${gi}-${pi}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={saving || uploadingKey === `${gi}:${pi}`}
                            onChange={(e) => {
                              const file = e.currentTarget.files?.[0];
                              if (!file) return;
                              onPickMemberPhoto(gi, pi, file);
                              e.currentTarget.value = '';
                            }}
                          />
                          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            <Button
                              asChild
                              variant="outline"
                              disabled={saving || uploadingKey === `${gi}:${pi}`}
                              className="w-full sm:w-auto"
                            >
                              <Label
                                htmlFor={`structure-photo-${gi}-${pi}`}
                                className="cursor-pointer"
                              >
                                {uploadingKey === `${gi}:${pi}`
                                  ? 'Uploading...'
                                  : p.photoUrl
                                    ? 'Ganti Foto'
                                    : 'Upload Foto'}
                              </Label>
                            </Button>
                            {p.photoUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full sm:w-auto"
                                disabled={saving || uploadingKey === `${gi}:${pi}`}
                                onClick={() =>
                                  setGroupsDirty((prev) =>
                                    prev.map((x, idx) =>
                                      idx === gi
                                        ? {
                                            ...x,
                                            people: x.people.map((pp, pidx) =>
                                              pidx === pi ? { ...pp, photoUrl: '' } : pp
                                            ),
                                          }
                                        : x
                                    )
                                  )
                                }
                              >
                                Hapus Foto
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <Label htmlFor={`${formId}-member-name-${gi}-${pi}`} className="sr-only">
                          Nama anggota {pi + 1} pada grup {g.title || gi + 1}
                        </Label>
                        <Input
                          id={`${formId}-member-name-${gi}-${pi}`}
                          value={p.name}
                          onChange={(e) =>
                            setGroupsDirty((prev) =>
                              prev.map((x, idx) =>
                                idx === gi
                                  ? {
                                      ...x,
                                      people: x.people.map((pp, pidx) =>
                                        pidx === pi ? { ...pp, name: e.target.value } : pp
                                      ),
                                    }
                                  : x
                              )
                            )
                          }
                          placeholder="Nama"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Label htmlFor={`${formId}-member-role-${gi}-${pi}`} className="sr-only">
                            Jabatan anggota {pi + 1} pada grup {g.title || gi + 1}
                          </Label>
                          <Input
                            id={`${formId}-member-role-${gi}-${pi}`}
                            value={p.role}
                            onChange={(e) =>
                              setGroupsDirty((prev) =>
                                prev.map((x, idx) =>
                                  idx === gi
                                    ? {
                                        ...x,
                                        people: x.people.map((pp, pidx) =>
                                          pidx === pi ? { ...pp, role: e.target.value } : pp
                                        ),
                                      }
                                    : x
                                )
                              )
                            }
                            placeholder="Jabatan"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              setConfirm({
                                open: true,
                                title: 'Hapus anggota ini?',
                                description: 'Tindakan ini tidak bisa dibatalkan.',
                                confirmText: 'Hapus',
                                variant: 'danger',
                                onConfirm: () =>
                                  setGroupsDirty((prev) =>
                                    prev.map((x, idx) =>
                                      idx === gi
                                        ? {
                                            ...x,
                                            people: x.people.filter((_, pidx) => pidx !== pi),
                                          }
                                        : x
                                    )
                                  ),
                              })
                            }
                          >
                            Hapus
                          </Button>
                        </div>
                        <div className="flex items-center justify-start gap-2 md:justify-center">
                          <Label
                            htmlFor={`${formId}-member-spotlight-${gi}-${pi}`}
                            className="text-sm font-medium text-foreground md:hidden"
                          >
                            Spotlight
                          </Label>
                          <Checkbox
                            id={`${formId}-member-spotlight-${gi}-${pi}`}
                            checked={Boolean(p.isSpotlight)}
                            onCheckedChange={(checked) => {
                              const next = Boolean(checked);
                              setGroupsDirty((prev) =>
                                prev.map((x, idx) =>
                                  idx === gi
                                    ? {
                                        ...x,
                                        people: x.people.map((pp, pidx) =>
                                          pidx === pi
                                            ? { ...pp, isSpotlight: next }
                                            : { ...pp, isSpotlight: next ? false : pp.isSpotlight }
                                        ),
                                      }
                                    : x
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <AdminCardActions>
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                setConfirm({
                  open: true,
                  title: 'Reset perubahan?',
                  description:
                    'Semua perubahan yang belum disimpan akan dikembalikan ke data terakhir yang tersimpan.',
                  confirmText: 'Reset',
                  variant: 'primary',
                  onConfirm: handleReset,
                })
              }
              disabled={saving || !dirty}
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="min-h-11 w-full sm:w-auto"
            >
              Simpan
            </Button>
          </AdminCardActions>
        </AdminCard>
      </CmsEditorLayout>
    </AdminPageShell>
  );
}
