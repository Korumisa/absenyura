import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** [UX] C-03 — pratinjau CMS dapat dilipat di layar kecil */
export function CmsPreviewCollapsible({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <div className={cn('xl:contents', className)}>
      <button
        type="button"
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 xl:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Pratinjau tampilan publik
        <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <div className={cn('hidden xl:block', open && 'block')}>{children}</div>
    </div>
  );
}
