import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, UserX, UserCheck } from 'lucide-react';
import { attendanceBadgeVariant, attendanceStatusLabel } from '@/lib/utils/classLabel';
import { cn } from '@/lib/utils/utils';

const statusIconMap: Record<string, any> = {
  PRESENT: CheckCircle2,
  LATE: Clock,
  ABSENT: XCircle,
  SICK: UserX,
  EXCUSED: UserCheck,
};

export function AttendanceStatusBadge({
  status,
  compact = false,
  className,
}: {
  status: string;
  compact?: boolean;
  className?: string;
}) {
  const Icon = statusIconMap[status];
  return (
    <Badge
      variant={attendanceBadgeVariant(status)}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {Icon ? <Icon size={compact ? 12 : 14} aria-hidden="true" className="shrink-0" /> : null}
      <span className={cn(compact && 'truncate max-w-[6rem] sm:max-w-none')}>
        {attendanceStatusLabel(status)}
      </span>
    </Badge>
  );
}
