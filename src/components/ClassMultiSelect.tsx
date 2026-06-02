import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Search, X } from 'lucide-react';
import api from '@/services/api';
import { formatClassLabel } from '@/lib/utils/classLabel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export type ClassOption = { id: string; name: string; semester: number };

type ClassMultiSelectProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  excludeClassIds?: string[];
  disabled?: boolean;
  label?: string;
  hint?: string;
};

export function ClassMultiSelect({
  value,
  onChange,
  excludeClassIds = [],
  disabled = false,
  label = 'Kelas (opsional)',
  hint,
}: ClassMultiSelectProps) {
  const [classSearch, setClassSearch] = useState('');
  const fetcher = (url: string) => api.get(url).then((res) => res.data.data as ClassOption[]);
  const { data: classes = [] } = useSWR<ClassOption[]>('/classes', fetcher, {
    revalidateOnFocus: false,
  });

  const excludeSet = useMemo(() => new Set(excludeClassIds), [excludeClassIds]);

  const availableClasses = useMemo(
    () => classes.filter((c) => !excludeSet.has(c.id)),
    [classes, excludeSet]
  );

  const filteredClasses = useMemo(
    () =>
      availableClasses.filter((c) =>
        c.name.toLowerCase().includes(classSearch.trim().toLowerCase())
      ),
    [availableClasses, classSearch]
  );

  const selectedClasses = useMemo(
    () =>
      value.flatMap((id) => {
        const result = classes.find((c) => c.id === id);
        return result ? [result] : [];
      }),
    [value, classes]
  );

  const toggleClass = (classId: string) => {
    const set = new Set(value);
    if (set.has(classId)) set.delete(classId);
    else set.add(classId);
    onChange(Array.from(set));
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={classSearch}
          onChange={(e) => setClassSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Cari kelas..."
          className="pl-9"
          disabled={disabled}
        />
      </div>

      <div className="scrollbar-hide max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-2">
        <div className="space-y-1.5">
          {filteredClasses.map((c) => {
            const selected = value.includes(c.id);
            return (
              <Button
                key={c.id}
                type="button"
                variant="ghost"
                disabled={disabled}
                className={[
                  'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                  selected
                    ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-900',
                ].join(' ')}
                onClick={() => toggleClass(c.id)}
              >
                <span className="font-medium">{formatClassLabel(c)}</span>
                {selected ? (
                  <span className="text-xs font-semibold">Terpilih</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Tambah</span>
                )}
              </Button>
            );
          })}
        </div>
        {filteredClasses.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {availableClasses.length === 0 ? 'Semua kelas sudah terdaftar.' : 'Tidak ada kelas.'}
          </div>
        ) : null}
      </div>

      {selectedClasses.length > 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="text-sm font-semibold text-foreground">Kelas dipilih:</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedClasses.map((c) => (
              <Badge key={c.id} variant="secondary" className="gap-1">
                <span className="max-w-[260px] truncate">{formatClassLabel(c)}</span>
                {!disabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-1 size-5"
                    onClick={() => onChange(value.filter((x) => x !== c.id))}
                    aria-label="Hapus kelas"
                  >
                    <X className="size-3" />
                  </Button>
                ) : null}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
