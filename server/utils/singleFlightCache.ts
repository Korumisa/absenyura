/** Bounded per-instance cache. Concurrent readers share work; only completed values get a TTL. */
export function createSingleFlightCache<T>(ttlMs: number, maxEntries = 32) {
  const entries = new Map<string, { promise: Promise<T>; expiresAt: number; settled: boolean }>();

  return {
    clear() {
      entries.clear();
    },
    get(key: string, load: () => Promise<T>): Promise<T> {
      const existing = entries.get(key);
      if (existing && (!existing.settled || existing.expiresAt > Date.now())) {
        return existing.promise;
      }
      entries.delete(key);
      if (entries.size >= maxEntries) {
        const evictable = [...entries].find(([, entry]) => entry.settled);
        if (evictable) entries.delete(evictable[0]);
        else
          return Promise.reject(
            Object.assign(new Error('Read capacity exceeded'), { code: 'SERVER_BUSY' })
          );
      }

      const entry = { promise: null as unknown as Promise<T>, expiresAt: 0, settled: false };
      entry.promise = Promise.resolve()
        .then(load)
        .then(
          (value) => {
            entry.expiresAt = Date.now() + ttlMs;
            entry.settled = true;
            return value;
          },
          (error: unknown) => {
            if (entries.get(key) === entry) entries.delete(key);
            throw error;
          }
        );
      entries.set(key, entry);
      return entry.promise;
    },
  };
}
