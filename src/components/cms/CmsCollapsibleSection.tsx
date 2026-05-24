import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** [IA] R1 — bagian sekunder (mis. kategori) tidak memenuhi layar editor */
export function CmsCollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          {description ? <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">{description}</p> : null}
        </div>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open ? <div className="border-t border-slate-200 px-5 py-4 dark:border-zinc-800">{children}</div> : null}
    </div>
  );
}
