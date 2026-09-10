import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils/utils';
import { ensureHttpsUrl } from '@/lib/http/ensureHttpsUrl';
import { buildCloudinarySrcSet, optimizeCloudinaryUrl } from '@/lib/media/cloudinaryImage';

type PublicCoverImageProps = {
  url?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Gambar above-the-fold (hero/LCP) — jangan lazy-load */
  priority?: boolean;
  /** Lebar tampilan perkiraan untuk Cloudinary & atribut sizes */
  displayWidth?: number;
};

export default function PublicCoverImage({
  url,
  alt,
  className,
  imgClassName,
  priority = false,
  displayWidth = 640,
}: PublicCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const rawSrc = useMemo(() => ensureHttpsUrl(url), [url]);
  const src = useMemo(
    () => (rawSrc ? optimizeCloudinaryUrl(rawSrc, { width: displayWidth }) : ''),
    [rawSrc, displayWidth]
  );
  const srcSet = useMemo(() => {
    if (!rawSrc || priority) return undefined;
    return buildCloudinarySrcSet(rawSrc, [
      Math.round(displayWidth * 0.75),
      displayWidth,
      Math.round(displayWidth * 1.5),
    ]);
  }, [rawSrc, displayWidth, priority]);
  const sizes = useMemo(() => {
    if (!srcSet) return undefined;
    return `(max-width: 768px) 100vw, ${displayWidth}px`;
  }, [srcSet, displayWidth]);

  const initial = useMemo(
    () =>
      String(alt ?? '')
        .trim()
        .slice(0, 1)
        .toUpperCase() || 'A',
    [alt]
  );
  const showImg = Boolean(src) && !failed;

  const isCloudinary = useMemo(() => /res\.cloudinary\.com/i.test(rawSrc ?? ''), [rawSrc]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      {showImg ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          className={cn('h-full w-full object-cover', imgClassName)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin={isCloudinary ? 'anonymous' : undefined}
          onError={() => setFailed(true)}
          {...(priority ? ({ fetchpriority: 'high' } as any) : {})}
        />
      ) : (
        <div className="relative h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200 dark:from-slate-800 dark:to-slate-900 dark:ring-white/10">
          <div className="grid h-full w-full place-items-center text-6xl font-extrabold text-[var(--public-primary)]/80 drop-shadow-sm dark:text-white/80">
            {initial}
          </div>
        </div>
      )}
    </div>
  );
}
