import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ensureHttpsUrl } from '@/lib/ensureHttpsUrl';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { DEFAULT_BRAND_LOGO_PNG, DEFAULT_BRAND_LOGO_WEBP } from '@/lib/staticBrandAssets';

type BrandLogoImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Logo di navbar — dimuat lebih dini */
  priority?: boolean;
};

function resolveLogoSrc(raw?: string | null): { webp?: string; fallback: string } {
  const url = ensureHttpsUrl(raw);
  if (!url) {
    return { webp: DEFAULT_BRAND_LOGO_WEBP, fallback: DEFAULT_BRAND_LOGO_PNG };
  }
  if (url.startsWith('/') && url.endsWith('.png') && !url.includes('logo-hmsdp')) {
    return { webp: DEFAULT_BRAND_LOGO_WEBP, fallback: DEFAULT_BRAND_LOGO_PNG };
  }
  if (/res\.cloudinary\.com/i.test(url)) {
    const optimized = optimizeCloudinaryUrl(url, { width: 192 });
    return { fallback: optimized };
  }
  return { fallback: url };
}

export function BrandLogoImage({ src, alt, className, priority = false }: BrandLogoImageProps) {
  const resolved = useMemo(() => resolveLogoSrc(src), [src]);

  if (resolved.webp) {
    return (
      <picture>
        <source srcSet={resolved.webp} type="image/webp" />
        <img
          src={resolved.fallback}
          alt={alt}
          className={cn('object-contain', className)}
          width={40}
          height={40}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
        />
      </picture>
    );
  }

  return (
    <img
      src={resolved.fallback}
      alt={alt}
      className={cn('object-contain', className)}
      width={40}
      height={40}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
