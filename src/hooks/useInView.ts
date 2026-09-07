import { useEffect, useRef, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
 * useInView() — Lightweight Intersection Observer wrapper
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * KEGUNAAN:
 *   Trigger class CSS `reveal-scroll-visible` HANYA ketika elemen MASUK
 *   ke area pandang pengguna (viewport). Ini menghemat CPU/baterai karena
 *   animasi di-below-fold TIDAK dijalankan sebelum user scroll ke sana.
 *
 * RULES KONSISTENSI (sesuai index.css anim system):
 *   • Gunakan `triggerOnce=true` (DEFAULT) — animasi hanya fire 1x
 *     (JANGAN looping anim scroll bolak-balik → bikin lag dan visual norak).
 *   • threshold=0.12 — trigger saat minimal 12% elemen terlihat.
 *     Jangan terlalu kecil (0) atau terlalu besar (0.5).
 *   • rootMargin default '-40px' — beri toleransi 40px sebelum masuk viewport
 *     agar anim mulai jalan sebelum elemen tepat di tepi layar.
 *
 * CONTOH PAKAI (dengan reveal-scroll class dari index.css):
 *   const { ref, inView } = useInView<HTMLDivElement>();
 *   <div
 *     ref={ref}
 *     className={`reveal-scroll ${inView ? 'reveal-scroll-visible' : ''}`}
 *   >
 *     StatCard content...
 *   </div>
 *
 * A11Y AUTOMATIC:
 *   Jika user aktifkan prefers-reduced-motion, guard di index.css line
 *   178-188 otomatis set transition→0.01ms meskipun inView=true.
 *   Jadi kita TIDAK perlu read media query di JS — pure CSS saja.
 * ═══════════════════════════════════════════════════════════════════════════ */

type UseInViewOptions = {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
};

export function useInView<T extends HTMLElement = HTMLElement>(
  options: UseInViewOptions = {}
): { ref: React.RefObject<T>; inView: boolean } {
  const { threshold = 0.12, rootMargin = '-40px', triggerOnce = true } = options;

  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    const node = ref.current;

    /* SSR guard: jika window tidak ada (server build) atau elemen null,
     * langsung return tanpa error. */
    if (typeof window === 'undefined' || !node) return;

    /* Fallback untuk browser SANGAT jadul yang tidak punya IO (~0.01% global).
     * Langsung anggap inView=true agar elemen tidak stuck opacity 0 selamanya. */
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            /* Trigger once = lebih hemat CPU, hindari anim bolak-balik. */
            if (triggerOnce) {
              if (triggered.current) return;
              triggered.current = true;
              observer.unobserve(entry.target);
            }
            setInView(true);
          } else if (!triggerOnce) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, inView };
}
