export interface StableKeyItem {
  _uuid: string;
}

export function withStableKey<T extends object>(item: T): T & StableKeyItem {
  return { ...item, _uuid: crypto.randomUUID() };
}

export function withStableKeyBulk<T extends object>(items: T[]): Array<T & StableKeyItem> {
  return items.map((it) => withStableKey(it));
}

export function newStableDraft<T extends object>(partial: Partial<T> = {}): T & StableKeyItem {
  return { ...(partial as T), _uuid: crypto.randomUUID() };
}
