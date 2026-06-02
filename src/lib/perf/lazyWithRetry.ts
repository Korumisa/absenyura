import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RELOAD_KEY = 'chunk_reload_attempted';

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

/** Lazy import dengan retry — mengatasi chunk 404 setelah deploy baru (PWA/cache) */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (!reloaded) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise(() => {
          /* menunggu reload */
        });
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      throw err;
    }
  });
}
