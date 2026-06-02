import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export function AdminBreadcrumbs({
  items,
  className,
}: {
  items: AdminBreadcrumbItem[];
  className?: string;
}) {
  if (!items.length) return null;
  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          const content =
            item.href && !isLast ? (
              <Link to={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && 'font-medium text-foreground')}>{item.label}</span>
            );

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3" aria-hidden="true" /> : null}
              {content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
