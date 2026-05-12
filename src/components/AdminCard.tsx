import React from 'react';

export default function AdminCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-[#e6edf5] bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950/40 ${className || ''}`}>
      {title || description || actions ? (
        <div className="flex flex-col gap-3 border-b border-[#e6edf5] px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            {title ? <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div> : null}
            {description ? <div className="text-sm text-slate-600 dark:text-zinc-300">{description}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  );
}
