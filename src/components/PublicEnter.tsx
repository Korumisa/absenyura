import React from 'react';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

/** Masuk halaman publik — animasi CSS ringan (hindari opacity:0 di above-the-fold / LCP) */
export default function PublicEnter({
  children,
  className,
  /** true = tanpa animasi masuk (untuk hero / elemen LCP) */
  instant,
}: {
  children: React.ReactNode;
  className?: string;
  instant?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion || instant) {
    return <div className={className}>{children}</div>;
  }

  return <div className={['public-enter', className].filter(Boolean).join(' ')}>{children}</div>;
}
