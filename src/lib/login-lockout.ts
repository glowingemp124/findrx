import { createPersistentStore } from "@/lib/persistent-store";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

type Attempts = Record<string, { failures: number; lockedUntil: number | null }>;

/**
 * Locks an email after 5 failed sign-ins for 15 minutes. One instance per portal,
 * so a pharmacy lockout doesn't affect FindRx staff and the other way round.
 */
export function createLoginLockout(storageKey: string) {
  const store = createPersistentStore<Attempts>(storageKey, {});

  return {
    /** Error to show when the email is locked right now, otherwise null. */
    check(key: string): string | null {
      const lockedUntil = store.get()[key]?.lockedUntil;
      if (!lockedUntil || lockedUntil <= Date.now()) return null;
      const minutes = Math.ceil((lockedUntil - Date.now()) / 60_000);
      return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
    },

    /** Records a failed attempt and returns the message to show. */
    fail(key: string, message: string): string {
      const record = store.get()[key] ?? { failures: 0, lockedUntil: null };
      const failures = (record.lockedUntil ? 0 : record.failures) + 1;
      const locked = failures >= MAX_FAILED_ATTEMPTS;
      store.update((all) => ({
        ...all,
        [key]: { failures: locked ? 0 : failures, lockedUntil: locked ? Date.now() + LOCKOUT_MS : null },
      }));
      if (locked) return "Too many attempts. This account is locked for 15 minutes.";
      const left = MAX_FAILED_ATTEMPTS - failures;
      return left <= 2 ? `${message} ${left} attempt${left === 1 ? "" : "s"} left.` : message;
    },

    clear(key: string) {
      store.update((all) => {
        if (!(key in all)) return all;
        const { [key]: _cleared, ...rest } = all;
        return rest;
      });
    },
  };
}
