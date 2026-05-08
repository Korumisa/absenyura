import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ensureHttpsUrl } from '@/lib/ensureHttpsUrl';

type PublicCoverImageProps = {
  url?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
};

export default function PublicCoverImage({ url, alt, className, imgClassName }: PublicCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => ensureHttpsUrl(url), [url]);
  const initial = useMemo(() => String(alt ?? '').trim().slice(0, 1).toUpperCase() || 'A', [alt]);
  const showImg = Boolean(src) && !failed;

  return (
    <div className={cn('relative h-full w-full', className)}>
      {showImg ? (
        <img
          src={src}
          alt={alt}
          className={cn('h-full w-full object-cover', imgClassName)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="relative h-full w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.24),rgba(15,23,42,0.05))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(255,255,255,0.04))]">
          <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.8),transparent_60%)]" />
          <div className="grid h-full w-full place-items-center text-6xl font-extrabold text-white/90 drop-shadow-sm">{initial}</div>
        </div>
      )}
    </div>
  );
}

