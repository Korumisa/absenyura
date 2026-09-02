import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Spinner } from '@/components/ui/skeleton';

interface SubmitButtonProps extends Pick<ButtonProps, 'className'> {
  isLoading?: boolean;
  label: string;
  loadingLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SubmitButton({
  isLoading = false,
  label,
  loadingLabel,
  icon,
  variant = 'default',
  disabled = false,
  onClick,
  type = 'submit',
  size = 'default',
  className,
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={isLoading || disabled}
      onClick={onClick}
      className={className}
    >
      {isLoading ? (
        <Spinner size={16} className="mr-2" />
      ) : (
        icon && <span className="mr-2">{icon}</span>
      )}
      {isLoading ? (loadingLabel ?? 'Menyimpan...') : label}
    </Button>
  );
}
