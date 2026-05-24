import { CmsPreviewCollapsible } from '@/components/ui/CmsPreviewCollapsible';
import { cn } from '@/lib/utils';

/** [IA] R1 — editor utama + pratinjau sticky (desktop) / collapsible (mobile) */
export function CmsEditorLayout({
  children,
  preview,
  className,
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] xl:gap-8', className)}>
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
        <div className="hidden xl:block">{preview}</div>
        <div className="xl:hidden">
          <CmsPreviewCollapsible>{preview}</CmsPreviewCollapsible>
        </div>
      </aside>
    </div>
  );
}
