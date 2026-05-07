import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import api from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PublicStructureGroup } from '@/types/publicSite';

export default function PublicSiteStructure() {
  const fetcher = (url: string) => api.get(url).then((r) => r.data.data);
  const { data: structure = [], mutate } = useSWR<PublicStructureGroup[]>('/public-site/admin/structure', fetcher, { revalidateOnFocus: false });

  const [structureJson, setStructureJson] = useState('');
  useEffect(() => {
    const mapped = (structure ?? []).map((g) => ({
      title: g.title,
      sortOrder: g.sort_order,
      people: (g.members ?? []).map((m) => ({
        name: m.name,
        role: m.role,
        sortOrder: m.sort_order,
      })),
    }));
    setStructureJson(JSON.stringify(mapped, null, 2));
  }, [structure]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(structureJson);
      if (!Array.isArray(parsed)) {
        toast.error('Struktur harus berupa JSON array');
        return;
      }
      await api.put('/public-site/admin/structure', { data: parsed });
      toast.success('Struktur organisasi tersimpan');
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'JSON struktur tidak valid');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const mapped = (structure ?? []).map((g) => ({
      title: g.title,
      sortOrder: g.sort_order,
      people: (g.members ?? []).map((m) => ({ name: m.name, role: m.role, sortOrder: m.sort_order })),
    }));
    setStructureJson(JSON.stringify(mapped, null, 2));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Struktur Organisasi</h1>
        <p className="text-slate-500 dark:text-zinc-400">Input struktur menggunakan format JSON array.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-4">
        <div className="space-y-2">
          <Label>JSON Struktur</Label>
          <Textarea
            value={structureJson}
            onChange={(e) => setStructureJson(e.target.value)}
            placeholder='[{"title":"INTI","people":[{"name":"Nama","role":"Ketua"}]}]'
            className="min-h-[240px]"
          />
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Format: array of &#123; title, sortOrder?, people: [&#123; name, role, sortOrder? &#125;] &#125;
          </div>
        </div>
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

