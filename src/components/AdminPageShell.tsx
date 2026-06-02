import React from 'react';

export default function AdminPageShell({
  title,
  description,
  breadcrumb,
  actions,
  icon,
  variant = 'plain',
  heroVariant = 'brand',
  children,
}: {
  title: string;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'hero' | 'plain';
  heroVariant?: 'brand' | 'gradient';
  children: React.ReactNode;
}) {
  const header =
    variant === 'plain' ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-foreground ring-1 ring-border">
              {icon}
            </div>
          ) : null}
          <div className="space-y-1">
            {breadcrumb ? <div className="pt-0.5">{breadcrumb}</div> : null}
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_button]:min-h-11 [&_button]:w-full [&_button]:sm:w-auto [&>div]:flex [&>div]:w-full [&>div]:flex-col [&>div]:gap-2 sm:[&>div]:w-auto sm:[&>div]:flex-row sm:[&>div]:flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
    ) : heroVariant === 'gradient' ? (
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(47,128,237,0.18),transparent_50%)]" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            {icon ? (
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground shadow-elevated ring-1 ring-border">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              {breadcrumb ? <div className="pb-1">{breadcrumb}</div> : null}
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_button]:min-h-11 [&_button]:w-full [&_button]:sm:w-auto [&>div]:flex [&>div]:w-full [&>div]:flex-col [&>div]:gap-2 sm:[&>div]:w-auto sm:[&>div]:flex-row sm:[&>div]:flex-wrap">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    ) : (
      <div className="rounded-xl border border-border bg-brand/5 p-5 shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {icon ? (
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              {breadcrumb ? <div className="pb-1">{breadcrumb}</div> : null}
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_button]:min-h-11 [&_button]:w-full [&_button]:sm:w-auto [&>div]:flex [&>div]:w-full [&>div]:flex-col [&>div]:gap-2 sm:[&>div]:w-auto sm:[&>div]:flex-row sm:[&>div]:flex-wrap">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-6 lg:p-8">
      {header}
      {children}
    </div>
  );
}
