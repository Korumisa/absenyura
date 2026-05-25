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
        'group relative flex flex-col rounded-lg border border-slate-200 bg-white',
        'transition hover:border-slate-300 hover:shadow-sm',
        'dark:border-slate-700 dark:bg-card dark:hover:border-slate-600',
      )}
    >
      <div className="h-1 rounded-t-lg bg-emerald-600" aria-hidden />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-base font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              aria-hidden
            >
              <GraduationCap className="h-6 w-6 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
                {classItem.name}
              </h3>
              {detail ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
              ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {count} {count === 1 ? 'mahasiswa' : 'mahasiswa'}
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
                  className="h-8 w-8 text-slate-500"
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
                  className="h-8 w-8 text-red-600 hover:text-red-700"
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

        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="truncate text-xs text-slate-500">
            Pengampu: <span className="font-medium text-slate-700 dark:text-slate-300">{classItem.lecturer.name}</span>
          </p>
          {classItem._count.sessions > 0 ? (
            <p className="mt-1 text-xs text-slate-400">{classItem._count.sessions} sesi absensi</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50/80 dark:border-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
      >
        Lihat daftar mahasiswa →
      </button>
    </article>
  );
}
