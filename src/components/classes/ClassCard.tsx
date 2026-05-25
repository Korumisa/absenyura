import { Users, Edit2, Trash2 } from 'lucide-react';
import type { ClassItem } from '@/types/class';
import { classDetailLine, formatClassLabel } from '@/lib/classLabel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function classInitial(name: string, courseCode?: string | null) {
  const src = String(courseCode || name || '').trim();
  return (src[0] || 'K').toUpperCase();
}

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
  const label = formatClassLabel(classItem) || classItem.name;
  const initial = classInitial(classItem.name, classItem.course_code);

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition',
        'hover:border-brand/35 hover:shadow-elevated dark:shadow-none dark:ring-1 dark:ring-white/10',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" aria-hidden />
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col items-stretch px-5 pb-3 pt-5 pl-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div
          className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-lg font-bold text-muted-foreground ring-1 ring-border"
          aria-hidden
        >
          {initial}
        </div>

        <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-foreground">{classItem.name}</h3>
        {detail ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{detail}</p> : null}
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {classItem._count.enrollments} mahasiswa
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {label}
          </Badge>
          <Badge variant="secondary" className="text-[11px]">
            {classItem._count.sessions} sesi
          </Badge>
        </div>
        <p className="mt-3 truncate text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">Pengampu:</span> {classItem.lecturer.name}
        </p>
      </button>

      {canManage ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 pl-5">
          <Button type="button" variant="outline" size="sm" className="min-h-10 flex-1" onClick={onOpen}>
            <Users className="mr-2 h-4 w-4" />
            Mahasiswa
          </Button>
          {onEdit ? (
            <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          ) : null}
          {isSuperAdmin && onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Hapus</span>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 pl-5">
          <Button type="button" variant="outline" size="sm" className="min-h-10 w-full" onClick={onOpen}>
            <Users className="mr-2 h-4 w-4" />
            Lihat daftar mahasiswa
          </Button>
        </div>
      )}
    </article>
  );
}
