/** Centered divider used between public page hero and content, and between sections. */
export function PublicSectionOrnament({
  className = '',
  compact = false,
  wide = false,
}: {
  className?: string;
  compact?: boolean;
  /** Longer gradient lines — better for filling empty vertical rhythm. */
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-full items-center justify-center gap-2 sm:gap-3 ${
        wide ? 'max-w-2xl' : 'max-w-lg'
      } ${compact ? 'py-1' : 'py-2'} ${className}`}
      aria-hidden="true"
    >
      <span
        className={`h-px flex-1 bg-gradient-to-r from-transparent via-[var(--public-primary)]/40 to-[var(--public-primary)]/55 ${
          wide ? 'max-w-[9rem] sm:max-w-[14rem]' : 'max-w-[3.5rem] sm:max-w-[7rem]'
        }`}
      />
      <span className="h-px w-3 bg-[var(--public-primary)]/35 sm:w-4" />
      <span className="size-1.5 rotate-45 border border-[var(--public-primary)]/60 bg-white" />
      <span className="size-2.5 rotate-45 bg-[var(--public-primary)] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
      <span className="size-1.5 rotate-45 border border-[var(--public-primary)]/60 bg-white" />
      <span className="h-px w-3 bg-[var(--public-primary)]/35 sm:w-4" />
      <span
        className={`h-px flex-1 bg-gradient-to-l from-transparent via-[var(--public-primary)]/40 to-[var(--public-primary)]/55 ${
          wide ? 'max-w-[9rem] sm:max-w-[14rem]' : 'max-w-[3.5rem] sm:max-w-[7rem]'
        }`}
      />
    </div>
  );
}
