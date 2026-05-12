import React from 'react';

export default function AdminPageShell({
  title,
  description,
  actions,
  icon,
  variant = 'plain',
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'hero' | 'plain';
  children: React.ReactNode;
}) {
  const header =
    variant === 'plain' ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-slate-700 ring-1 ring-black/10 dark:bg-zinc-950/40 dark:text-zinc-200 dark:ring-white/10">
              {icon}
            </div>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">{title}</h1>
            {description ? <p className="text-sm text-slate-500 dark:text-zinc-400">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    ) : (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(79,70,229,0.18),transparent_50%),radial-gradient(circle_at_85%_30%,rgba(139,92,246,0.16),transparent_55%),radial-gradient(circle_at_35%_85%,rgba(56,189,248,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            {icon ? (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-[0_18px_45px_-30px_rgba(79,70,229,0.55)] ring-1 ring-black/10 dark:ring-white/10">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
              {description ? <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-zinc-300">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {header}
      {children}
    </div>
  );
}

