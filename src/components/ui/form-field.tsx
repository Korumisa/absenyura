import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/utils';

interface FormFieldProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  description?: React.ReactNode;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
  }) => React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  description,
  className,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-red-500 ml-1">*</span> : null}
      </Label>
      {children({
        id,
        'aria-describedby': ariaDescribedBy,
        'aria-invalid': Boolean(error),
      })}
      {description ? (
        <span id={descriptionId} className="text-xs text-muted-foreground block">
          {description}
        </span>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
