import type { KeyboardEvent } from 'react';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react';
import type { ClassItem } from '@/types/class';
import { classDetailLine } from '@/lib/classLabel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ClassCard({
  classItem,
  canManage,
  isSuperAdmin,
  onOpen,
  onEdit,
  onDelete,
}: {
  classItem: ClassItem;
  canManage: boolean;
  isSuperAdmin: boolean;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const detail = classDetailLine(classItem);
  const count = classItem._count.enrollments;

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Buka daftar mahasiswa kelas ${classItem.name}`}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card',
        'transition hover:border-brand/40 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="h-1 bg-brand" aria-hidden />

      <div className="flex flex-1 flex-col p-4">
        <div className="relative flex items-start gap-3 pr-14">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"
            aria-hidden
          >
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-h-[5.25rem] min-w-0 flex-1 pt-0.5">
            <h3 className="line-clamp-1 text-base font-bold leading-snug text-foreground">{classItem.name}</h3>
            <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
              {detail || '\u00a0'}
            </p>
            <p className="mt-2 mb-4 text-xs font-semibold uppercase tracking-wide text-brand">
              {count} mahasiswa
            </p>
          </div>
        </div>

        {canManage ? (
          <div
            className="absolute right-3 top-4 flex shrink-0 gap-0.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit kelas"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {isSuperAdmin && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Hapus kelas"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto border-t border-border pt-4">
          <p className="truncate text-xs text-muted-foreground">
            Pengampu: <span className="font-medium text-foreground">{classItem.lecturer.name}</span>
          </p>
          <p className="mt-1 min-h-[1.125rem] text-xs text-muted-foreground">
            {classItem._count.sessions > 0
              ? `${classItem._count.sessions} sesi absensi`
              : '\u00a0'}
          </p>
        </div>
      </div>
    </article>
  );
}
