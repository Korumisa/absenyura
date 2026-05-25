import useHorizontalWheelScroll from '@/lib/useHorizontalWheelScroll';

export function HorizontalSnapRail({
  children,
  ariaLabel,
  setScroller,
  onScroll,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  setScroller?: (el: HTMLDivElement | null) => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  const wheel = useHorizontalWheelScroll(true);
  return (
    <div
      ref={(node) => {
        wheel.ref(node);
        setScroller?.(node as HTMLDivElement | null);
      }}
      onWheelCapture={wheel.onWheel}
      onScroll={onScroll}
      className="overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide"
      style={{
        touchAction: 'pan-x',
        overscrollBehaviorX: 'contain',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
      }}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
