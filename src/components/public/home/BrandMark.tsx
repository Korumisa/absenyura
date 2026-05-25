import { BrandLogoImage } from '@/components/public/BrandLogoImage';

export function BrandMark({ className, src, name }: { className?: string; src: string; name: string }) {
  if (src) {
    return (
      <div className={className}>
        <BrandLogoImage src={src} alt={name || 'Logo'} className="h-full w-full" />
      </div>
    );
  }
  const first = String(name || '').trim().slice(0, 1).toUpperCase() || 'H';
  return (
    <div
      className={[
        className,
        'grid place-items-center rounded-2xl bg-[var(--public-primary)]/15 text-[var(--public-primary)] ring-1 ring-black/10',
      ].join(' ')}
    >
      <div className="text-2xl font-extrabold">{first}</div>
    </div>
  );
}

