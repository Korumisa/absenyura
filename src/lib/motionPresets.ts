import type { Transition } from 'framer-motion';

/** [A11y] P2 — viewport scroll reveal: animasi sekali per elemen */
export const REVEAL_VIEWPORT = { once: true, amount: 0.2 as const };

/** Transisi Framer Motion — nol durasi jika pengguna minta gerak dikurangi */
export function motionTransition(reduced: boolean, normal: Transition = { duration: 0.45, ease: 'easeOut' }): Transition {
  return reduced ? { duration: 0 } : normal;
}

export function fadeTransition(reduced: boolean, duration = 0.18): Transition {
  return reduced ? { duration: 0 } : { duration, ease: 'easeOut' };
}
