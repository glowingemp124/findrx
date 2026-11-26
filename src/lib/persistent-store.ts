import { useSyncExternalStore } from "react";

/**
 * A small Web Storage-backed store (localStorage by default) that React can subscribe to.
 * Snapshots are cached so `useSyncExternalStore` sees a stable reference
 * between writes, and other tabs stay in sync through the `storage` event.
 */
export function createPersistentStore<T>(
  key: string,
  fallback: T,
  { storage = localStorage }: { storage?: Storage } = {},
) {
  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());

  const get = (): T => {
    if (!loaded) {
      try {
        const raw = storage.getItem(key);
        cache = raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        cache = fallback;
      }
      loaded = true;
    }
    return cache;
  };

  const set = (next: T) => {
    if (loaded && Object.is(next, cache)) return;
    cache = next;
    loaded = true;
    try {
      storage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage is full or unavailable. In-memory state still updates for this session.
    }
    emit();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  window.addEventListener("storage", (event) => {
    if (event.key !== key) return;
    loaded = false;
    emit();
  });

  return {
    get,
    set,
    update: (recipe: (current: T) => T) => set(recipe(get())),
    subscribe,
    use: () => useSyncExternalStore(subscribe, get),
  };
}
