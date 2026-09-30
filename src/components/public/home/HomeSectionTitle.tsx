import { cn } from '@/lib/utils/utils';

type HomeSectionTitleProps = {
  eyebrow?: string;
  lead: string;
  accent: string;
  support?: string;
  align?: 'center' | 'left';
  className?: string;
};

/**
 * Split display title inspired by HMTI section rhythm (italic lead + bold accent),
 * but owned by HMSDP: quieter eyebrow, tighter measure, no cloned chrome.
 */
export function HomeSectionTitle({
  eyebrow,
  lead,
  accent,
  support,
  align = 'center',
  className,
}: HomeSectionTitleProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--public-primary)]',
            align === 'center' ? 'mx-auto' : '',
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn('tracking-tight text-slate-900', eyebrow ? 'mt-3' : '')}>
        <span className="block font-display text-4xl italic sm:text-5xl md:text-6xl">{lead}</span>
        <span className="-mt-1 block text-4xl font-extrabold uppercase text-[var(--public-primary)] sm:-mt-2 sm:text-5xl md:text-6xl">
          {accent}
        </span>
      </h2>
      {support ? (
        <p
          className={cn(
            'mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]',
            align === 'center' ? 'mx-auto' : '',
          )}
        >
          {support}
        </p>
      ) : null}
    </div>
  );
}
