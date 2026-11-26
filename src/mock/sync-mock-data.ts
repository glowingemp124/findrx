/**
 * Mock only. Brings the browser's saved demo data in line with the current seeds.
 *
 * Bump MOCK_DATA_VERSION whenever seed data changes. On the next load, every seeded record
 * (demo pharmacies, the FindRx team, their decision log, seeded claim history and transactions)
 * is dropped so the services re-seed it fresh. Anything a person created (sign-ups, staff added
 * by the Owner, real requests and their claims) is kept.
 *
 * Runs before the app's modules load (first import in main.tsx), so it works on raw storage.
 * Delete this file with the rest of the mock data.
 */

export const MOCK_DATA_VERSION = "2026-11-26.1";

const VERSION_KEY = "findrx-mock-version";

const SEEDED_PHARMACY_IDS = [
  "pharmacy-riverbend",
  "pharmacy-northside",
  "pharmacy-eastgate",
  "pharmacy-bellaire",
  "pharmacy-harbor",
  "pharmacy-maple",
  "pharmacy-bayou",
  "pharmacy-cedar",
  "pharmacy-gulf",
  "pharmacy-pine",
];
const SEEDED_ADMIN_IDS = ["admin-owner", "admin-priya", "admin-marcus", "admin-elena", "admin-tom"];
const isSeededHistory = (requestId: string) => requestId.startsWith("seeded-") || requestId.startsWith("archived-");

function prune<T>(key: string, keep: (item: T) => boolean) {
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const list = JSON.parse(raw) as T[];
    if (Array.isArray(list)) localStorage.setItem(key, JSON.stringify(list.filter(keep)));
  } catch {
    localStorage.removeItem(key);
  }
}

function syncMockData() {
  try {
    if (localStorage.getItem(VERSION_KEY) === MOCK_DATA_VERSION) return;
    prune<{ id: string }>("findrx-pharmacy-accounts", (item) => !SEEDED_PHARMACY_IDS.includes(item.id));
    prune<{ id: string }>("findrx-admin-accounts", (item) => !SEEDED_ADMIN_IDS.includes(item.id));
    prune<{ pharmacyId: string }>("findrx-pharmacy-reviews", (item) => !SEEDED_PHARMACY_IDS.includes(item.pharmacyId));
    prune<{ requestId: string }>("findrx-claim-ledger", (item) => !isSeededHistory(item.requestId));
    prune<{ requestId: string }>("findrx-transactions", (item) => !isSeededHistory(item.requestId));
    localStorage.setItem(VERSION_KEY, MOCK_DATA_VERSION);
  } catch {
    // Storage unavailable: the app falls back to in-memory seeds.
  }
}

syncMockData();
