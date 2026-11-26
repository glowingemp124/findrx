import { platformSettings } from "@/features/platform/platform-settings";
import { clientConfig } from "@/features/requests/config";
import { resolvePhase } from "@/features/requests/lib/request-phase";
import type { BlindRequest } from "@/features/requests/types";
import { createPersistentStore } from "@/lib/persistent-store";

export type ClaimOutcome = "awaiting_payment" | "paid" | "expired";

/**
 * One claim by one pharmacy. Outlives the request itself: once the request's data is deleted
 * (24 hours after it closes) the entry keeps only its counts, which is what History shows for earlier days.
 */
export type LedgerEntry = {
  id: string;
  pharmacyId: string;
  requestId: string;
  claimedAt: number;
  outcome: ClaimOutcome;
  resolvedAt: number | null;
  /** Medication summary; null once the request's details have been deleted. */
  medication: string | null;
  transactionId: string | null;
  /** Internal team note: the patient has been called. */
  contactedAt: number | null;
};

const store = createPersistentStore<LedgerEntry[]>("findrx-claim-ledger", []);

const SEED_PREFIX = "seeded-";

/** Pharmacies that get mock claim history (the two demo logins). */
export const SEEDED_HISTORY_PHARMACIES = ["pharmacy-riverbend", "pharmacy-northside"];

function resolve(entry: LedgerEntry, request: BlindRequest | undefined, now: number): LedgerEntry {
  const deadline = entry.claimedAt + clientConfig.checkoutWindowMs;
  const stillMine = request?.claim?.pharmacyId === entry.pharmacyId && request.claim.claimedAt === entry.claimedAt;

  if (stillMine && request?.payment) {
    return { ...entry, outcome: "paid", resolvedAt: request.payment.paidAt, transactionId: request.payment.transactionId };
  }
  const lapsed = !stillMine || (request && resolvePhase(request, now) === "checkout_expired") || now >= deadline;
  return lapsed ? { ...entry, outcome: "expired", resolvedAt: Math.min(deadline, now) } : entry;
}

/** Drops details once the request's own retention period has passed. */
function forget(entry: LedgerEntry, now: number): LedgerEntry {
  if (entry.resolvedAt === null || entry.medication === null || now < entry.resolvedAt + platformSettings.retentionMs()) return entry;
  return { ...entry, medication: null, transactionId: null };
}

export const claimLedger = {
  use: store.use,

  record(pharmacyId: string, requestId: string, medication: string, claimedAt: number) {
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      pharmacyId,
      requestId,
      claimedAt,
      outcome: "awaiting_payment",
      resolvedAt: null,
      medication,
      transactionId: null,
      contactedAt: null,
    };
    store.update((entries) => [...entries, entry]);
  },

  /** Brings outcomes in line with the requests. Returns the same array when nothing changed. */
  reconcile(requests: BlindRequest[], now: number) {
    store.update((entries) => {
      let changed = false;
      const next = entries.map((entry) => {
        const resolved = entry.outcome === "awaiting_payment" ? resolve(entry, requests.find((r) => r.id === entry.requestId), now) : entry;
        const updated = forget(resolved, now);
        if (updated !== entry) changed = true;
        return updated;
      });
      return changed ? next : entries;
    });
  },

  setContacted(entryId: string, contacted: boolean) {
    store.update((entries) =>
      entries.map((entry) => (entry.id === entryId ? { ...entry, contactedAt: contacted ? Date.now() : null } : entry)),
    );
  },

  /**
   * Mock only: 30 days of past claims for a seeded pharmacy, so My claims history, History and
   * the pharmacy dashboard have data. Earlier days keep counts only, like real retention.
   */
  seedHistory(pharmacyId: string, now: number) {
    const marker = `${SEED_PREFIX}${pharmacyId}`;
    if (store.get().some((entry) => entry.requestId.startsWith(marker))) return;

    const day = 24 * 60 * 60_000;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    // Deterministic per pharmacy, so the seed looks the same on every machine.
    let state = [...pharmacyId].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0;
    const random = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
    // Claims cluster in the morning and after work, like patient traffic.
    const hours = [9, 10, 10, 11, 11, 12, 13, 15, 16, 17, 17, 18, 19, 20];

    const seeded: LedgerEntry[] = [];
    for (let daysAgo = 1; daysAgo <= 30; daysAgo += 1) {
      const weekday = new Date(today.getTime() - daysAgo * day).getDay();
      const count = Math.round((weekday === 0 ? 1.5 : weekday === 6 ? 3 : 4.5) + random() * 3);
      for (let index = 0; index < count; index += 1) {
        const claimedAt = today.getTime() - daysAgo * day + hours[Math.floor(random() * hours.length)] * 60 * 60_000 + Math.floor(random() * 50) * 60_000;
        const paid = random() < 0.8;
        seeded.push({
          id: crypto.randomUUID(),
          pharmacyId,
          requestId: `${marker}-${daysAgo}-${index}`,
          claimedAt,
          outcome: paid ? "paid" : "expired",
          resolvedAt: claimedAt + (paid ? Math.floor(5 + random() * 40) : 60) * 60_000,
          medication: null,
          transactionId: null,
          contactedAt: null,
        });
      }
    }
    // Replace the older, smaller seed if it's there.
    store.update((entries) => [...seeded, ...entries.filter((entry) => !entry.requestId.startsWith("archived-"))]);
  },
};
