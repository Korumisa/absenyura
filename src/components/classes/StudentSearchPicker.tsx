import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/utils';

export type StudentPickerOption = {
  id: string;
  name: string;
  nim_nip?: string | null;
  email?: string | null;
};

export default function StudentSearchPicker({
  options,
  value,
  onChange,
  placeholder = 'Cari nama atau NIM mahasiswa…',
  disabled,
  emptyLabel = 'Semua mahasiswa sudah terdaftar',
}: {
  options: StudentPickerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    return options
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.nim_nip && o.nim_nip.toLowerCase().includes(q)) ||
          (o.email && o.email.toLowerCase().includes(q))
      )
      .slice(0, 80);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
          className="h-11 w-full justify-between font-normal"
        >
          <span className="truncate">
            {options.length === 0
              ? emptyLabel
              : selected
                ? `${selected.name}${selected.nim_nip ? ` (${selected.nim_nip})` : ''}`
                : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik nama atau NIM…"
              className="h-9 pl-8"
              autoFocus
            />
          </div>
        </div>
        <ul className="max-h-60 overflow-y-auto p-1" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Tidak ada hasil</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === item.id}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted',
                    value === item.id && 'bg-muted'
                  )}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      value === item.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[item.nim_nip, item.email].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        {options.length > 80 && !query.trim() ? (
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Ketik untuk mempersempit daftar ({options.length} mahasiswa)
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
