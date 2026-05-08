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
      <div className="pointer-events-none absolute inset-0 z-10 ring-1 ring-white/25 dark:ring-white/15" />
      <div className="pointer-events-none absolute inset-0 z-10 opacity-85 [background:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.28),transparent_55%)]" />
      <span
        className="pointer-events-none absolute z-20 border-l-[3px] border-t-[3px] border-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)] dark:border-white/55"
        style={{ left: pad, top: pad, width: corner, height: corner }}
      />
      <span
        className="pointer-events-none absolute z-20 border-r-[3px] border-t-[3px] border-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)] dark:border-white/55"
        style={{ right: pad, top: pad, width: corner, height: corner }}
      />
      <span
        className="pointer-events-none absolute z-20 border-b-[3px] border-l-[3px] border-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)] dark:border-white/55"
        style={{ left: pad, bottom: pad, width: corner, height: corner }}
      />
      <span
        className="pointer-events-none absolute z-20 border-b-[3px] border-r-[3px] border-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)] dark:border-white/55"
        style={{ right: pad, bottom: pad, width: corner, height: corner }}
      />

      <span
        className="pointer-events-none absolute z-20 border-l border-t border-white/35 dark:border-white/25"
        style={{ left: pad + 6, top: pad + 6, width: Math.max(10, corner - 8), height: Math.max(10, corner - 8) }}
      />
      <span
        className="pointer-events-none absolute z-20 border-r border-t border-white/35 dark:border-white/25"
        style={{ right: pad + 6, top: pad + 6, width: Math.max(10, corner - 8), height: Math.max(10, corner - 8) }}
      />
      <span
        className="pointer-events-none absolute z-20 border-b border-l border-white/35 dark:border-white/25"
        style={{ left: pad + 6, bottom: pad + 6, width: Math.max(10, corner - 8), height: Math.max(10, corner - 8) }}
      />
      <span
        className="pointer-events-none absolute z-20 border-b border-r border-white/35 dark:border-white/25"
        style={{ right: pad + 6, bottom: pad + 6, width: Math.max(10, corner - 8), height: Math.max(10, corner - 8) }}
      />
    </div>
  );
}
