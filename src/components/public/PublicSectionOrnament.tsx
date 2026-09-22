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
      className={`mx-auto flex w-full max-w-md items-center justify-center gap-2 ${compact ? 'py-1' : 'py-2'} ${className}`}
      aria-hidden="true"
    >
      <span className="h-px flex-1 max-w-[4.5rem] bg-gradient-to-r from-transparent to-[var(--public-primary)]/45 sm:max-w-[6rem]" />
      <span className="size-1 rotate-45 bg-[var(--public-primary)]/35" />
      <span className="size-1.5 rotate-45 bg-[var(--public-primary)]/70" />
      <span className="size-1 rotate-45 bg-[var(--public-primary)]/35" />
      <span className="h-px flex-1 max-w-[4.5rem] bg-gradient-to-l from-transparent to-[var(--public-primary)]/45 sm:max-w-[6rem]" />
    </div>
  );
}
