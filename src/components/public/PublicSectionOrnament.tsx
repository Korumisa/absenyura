/** Centered divider used between public page hero and content, and between sections. */
export function PublicSectionOrnament({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-full max-w-lg items-center justify-center gap-2.5 ${compact ? 'py-1' : 'py-2'} ${className}`}
      aria-hidden="true"
    >
      <span className="h-px flex-1 max-w-[3.5rem] bg-gradient-to-r from-transparent to-[var(--public-primary)]/50 sm:max-w-[7rem]" />
      <span className="size-1 rotate-45 bg-[var(--public-primary)]/30" />
      <span className="size-1.5 rotate-45 border border-[var(--public-primary)]/55 bg-[var(--public-primary)]/15" />
      <span className="size-2 rotate-45 bg-[var(--public-primary)]/80" />
      <span className="size-1.5 rotate-45 border border-[var(--public-primary)]/55 bg-[var(--public-primary)]/15" />
      <span className="size-1 rotate-45 bg-[var(--public-primary)]/30" />
      <span className="h-px flex-1 max-w-[3.5rem] bg-gradient-to-l from-transparent to-[var(--public-primary)]/50 sm:max-w-[7rem]" />
    </div>
  );
}
