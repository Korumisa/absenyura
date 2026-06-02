import { format, parseISO, isValid } from 'date-fns';
import { id as dateFnsId } from 'date-fns/locale';
import { id as dayPickerId } from 'react-day-picker/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import 'react-day-picker/style.css';

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value.length === 10 ? value : value.slice(0, 10));
  return isValid(d) ? d : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  className,
  id,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  const selected = parseDateValue(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'min-h-11 w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" aria-hidden="true" />
          {selected ? format(selected, 'dd MMM yyyy', { locale: dateFnsId }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => onChange(day ? format(day, 'yyyy-MM-dd') : '')}
          locale={dayPickerId}
        />
        {value ? (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground"
              onClick={() => onChange('')}
            >
              <X className="mr-2 size-4" aria-hidden="true" />
              Hapus tanggal
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
