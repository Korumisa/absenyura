import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { PublicStructureGroup } from '@/types/publicSite';

export default function PublicSiteStructure() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: structure = [], mutate } = useSWR<PublicStructureGroup[]>('/public-site/admin/structure', fetcher, { revalidateOnFocus: false });

  type MemberDraft = { name: string; role: string };
  type GroupDraft = { title: string; people: MemberDraft[] };
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  useEffect(() => {
    const mapped: GroupDraft[] = (structure ?? []).map((g) => ({
      title: g.title ?? '',
      people: (g.members ?? []).map((m) => ({ name: m.name ?? '', role: m.role ?? '' })),
    }));
    setGroups(mapped);
  }, [structure]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = groups.map((g, gi) => ({
        title: g.title,
        sortOrder: gi,
        people: (g.people ?? []).map((p, pi) => ({ name: p.name, role: p.role, sortOrder: pi })),
      }));
      await api.put('/public-site/admin/structure', { data: payload });
      toast.success('Struktur organisasi tersimpan');
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const mapped: GroupDraft[] = (structure ?? []).map((g) => ({
      title: g.title ?? '',
      people: (g.members ?? []).map((m) => ({ name: m.name ?? '', role: m.role ?? '' })),
    }));
    setGroups(mapped);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Struktur Organisasi</h1>
        <p className="text-slate-500 dark:text-zinc-400">Tambahkan grup dan anggota tanpa perlu JSON.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Grup Struktur</div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setGroups((prev) => [...prev, { title: '', people: [{ name: '', role: '' }] }])}
          >
            Tambah Grup
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
            Belum ada struktur. Klik “Tambah Grup” untuk mulai.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setGroups((prev) => prev.map((x, idx) => (idx === gi ? { ...x, people: [...x.people, { name: '', role: '' }] } : x)))
                      }
                    >
                      Tambah Anggota
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setGroups((prev) => prev.filter((_, idx) => idx !== gi))}
                    >
                      Hapus Grup
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Nama</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Jabatan</div>
                  </div>
                  {g.people.map((p, pi) => (
                    <div key={pi} className="grid gap-3 md:grid-cols-2">
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
                            setGroups((prev) =>
                              prev.map((x, idx) => (idx === gi ? { ...x, people: x.people.filter((_, pidx) => pidx !== pi) } : x))
                            )
                          }
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={handleReset} disabled={saving}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

