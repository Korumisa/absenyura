import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** [A11y] P-02 — focus trap, Escape, restore focus ke trigger */
export function useDialogA11y(
  open: boolean,
  onClose: () => void,
  options?: {
    containerRef?: RefObject<HTMLElement | null>;
    triggerRef?: RefObject<HTMLElement | null>;
  }
) {
  const fallbackRef = useRef<HTMLElement | null>(null);
  const containerRef = options?.containerRef ?? fallbackRef;
  const triggerRef = options?.triggerRef;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const root = containerRef.current;
    if (!root) return;
    const trigger = triggerRef?.current ?? null;

    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled')
      );

    const focusFirst = () => {
      const list = getFocusable();
      (list[0] ?? root).focus();
    };

    const t = window.setTimeout(focusFirst, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = getFocusable();
      if (!list.length) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      (trigger ?? previousFocus)?.focus?.();
    };
  }, [open, onClose, containerRef, triggerRef]);
}
