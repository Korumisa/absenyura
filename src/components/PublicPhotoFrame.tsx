import React from 'react';
import { cn } from '@/lib/utils';

export default function PublicPhotoFrame({
  className,
  children,
  inset = 12,
}: {
  className?: string;
  children: React.ReactNode;
  inset?: number;
}) {
  const pad = Math.max(0, Math.floor(inset));
  const corner = Math.max(10, Math.floor(pad * 1.25));

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-white/15 dark:ring-white/10" />
      <div className="pointer-events-none absolute inset-0 opacity-85 [background:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.28),transparent_55%)]" />
      <span
        className="pointer-events-none absolute border-l-2 border-t-2 border-white/70 dark:border-white/45"
        style={{ left: pad, top: pad, width: corner, height: corner }}
      />
      <span
        className="pointer-events-none absolute border-r-2 border-t-2 border-white/70 dark:border-white/45"
        style={{ right: pad, top: pad, width: corner, height: corner }}
      />
      <span
        className="pointer-events-none absolute border-l-2 border-b-2 border-white/70 dark:border-white/45"
        style={{ left: pad, bottom: pad, width: corner, height: corner }}
      />
      <span
        className="pointer-events-none absolute border-r-2 border-b-2 border-white/70 dark:border-white/45"
        style={{ right: pad, bottom: pad, width: corner, height: corner }}
      />
    </div>
  );
}

