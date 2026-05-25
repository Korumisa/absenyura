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

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card',
        'transition hover:border-brand/40 hover:shadow-sm',
      )}
    >
      <div className="h-1 bg-brand" aria-hidden />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"
              aria-hidden
            >
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-base font-bold leading-snug text-foreground">{classItem.name}</h3>
              {detail ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{detail}</p>
              ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {count} mahasiswa
              </p>
            </div>
          </button>

          {canManage ? (
            <div className="flex shrink-0 gap-0.5">
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
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <p className="truncate text-xs text-muted-foreground">
            Pengampu: <span className="font-medium text-foreground">{classItem.lecturer.name}</span>
          </p>
          {classItem._count.sessions > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">{classItem._count.sessions} sesi absensi</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="border-t border-border bg-muted/30 px-4 py-3 text-left text-sm font-semibold text-brand transition hover:bg-brand/10"
      >
        Lihat daftar mahasiswa →
      </button>
    </article>
  );
}
