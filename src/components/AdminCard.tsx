import React from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils/utils';

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
    <Card className={cn(className)}>
      {title || description || actions ? (
        <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            {title ? <div className="text-sm font-semibold text-foreground">{title}</div> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_button]:min-h-11 [&_button]:w-full [&_button]:sm:w-auto">
              {actions}
            </div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col gap-6 p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}
