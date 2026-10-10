import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export type BreadcrumbItem = { label: string; href?: string; current?: boolean };

const ACTIONS_CLASS =
  'flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_button]:min-h-11 [&_button]:w-full [&_button]:sm:w-auto [&>div]:flex [&>div]:w-full [&>div]:flex-col [&>div]:gap-2 sm:[&>div]:w-auto sm:[&>div]:flex-row sm:[&>div]:flex-wrap';

function Crumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, idx) => (
          <li key={item.label + idx} className="flex items-center gap-1">
            {idx > 0 ? <ChevronRight className="size-3 opacity-60" aria-hidden /> : null}
            {item.current ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                to={item.href}
                className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function AdminPageShell({
  title,
  description,
  breadcrumb,
  breadcrumbItems,
  actions,
  icon,
  variant = 'plain',
  heroVariant = 'brand',
  children,
}: {
  title: string;
  description?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'hero' | 'plain';
  heroVariant?: 'brand' | 'gradient';
  children: React.ReactNode;
}) {
  const isHero = variant === 'hero';
  const crumbs = breadcrumbItems ? (
    <Crumbs items={breadcrumbItems} />
  ) : breadcrumb ? (
    <div>{breadcrumb}</div>
  ) : null;

  const titleBlock = (
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
      {icon ? (
        <div
          className={cn(
            'grid shrink-0 place-items-center rounded-lg',
            isHero
              ? 'size-12 bg-brand text-brand-foreground shadow-elevated'
              : 'size-10 bg-brand/10 text-brand dark:bg-brand/20'
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        {crumbs}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );

  const body = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {titleBlock}
      {actions ? <div className={ACTIONS_CLASS}>{actions}</div> : null}
    </div>
  );

  const header = !isHero ? (
    body
  ) : (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border shadow-card dark:shadow-none dark:ring-1 dark:ring-white/10',
        heroVariant === 'gradient' ? 'bg-card' : 'bg-brand/5'
      )}
    >
      {heroVariant === 'gradient' ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(47,128,237,0.18),transparent_50%)]" />
      ) : null}
      <div className="relative p-5 sm:p-7">{body}</div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      {header}
      {children}
    </div>
  );
}
