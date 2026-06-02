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
          fetchPriority={priority ? 'high' : undefined}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="relative h-full w-full bg-[linear-gradient(135deg,rgba(37,99,235,0.24),rgba(15,23,42,0.05))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(255,255,255,0.04))]">
          <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.8),transparent_60%)]" />
          <div className="grid h-full w-full place-items-center text-6xl font-extrabold text-white/90 drop-shadow-sm">
            {initial}
          </div>
        </div>
      )}
    </div>
  );
}
