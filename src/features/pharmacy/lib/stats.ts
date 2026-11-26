import type { Transaction } from "@/features/requests/services/transaction-store";
import { startOfDay } from "@/features/pharmacy/lib/claims";
import type { LedgerEntry } from "@/features/pharmacy/services/claim-ledger";

export type RangeKey = "today" | "7d" | "30d";

export const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export type ClaimBucket = { label: string; detail: string; claimed: number; paid: number; expired: number; awaiting: number };

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const hourLabel = (hour: number) => `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;

export function rangeStart(range: RangeKey, now: number) {
  const today = startOfDay(now);
  return range === "today" ? today : today - ((range === "7d" ? 7 : 30) - 1) * DAY;
}

function count(entries: LedgerEntry[]): Omit<ClaimBucket, "label" | "detail"> {
  return {
    claimed: entries.length,
    paid: entries.filter((entry) => entry.outcome === "paid").length,
    expired: entries.filter((entry) => entry.outcome === "expired").length,
    awaiting: entries.filter((entry) => entry.outcome === "awaiting_payment").length,
  };
}

/** Claims per hour (today) or per day, with outcomes. */
export function claimSeries(range: RangeKey, ledger: LedgerEntry[], now: number): ClaimBucket[] {
  const today = startOfDay(now);
  if (range === "today") {
    return Array.from({ length: new Date(now).getHours() + 1 }, (_, hour) => {
      const start = today + hour * HOUR;
      return {
        label: hourLabel(hour),
        detail: `${hourLabel(hour)}m`,
        ...count(ledger.filter((entry) => entry.claimedAt >= start && entry.claimedAt < start + HOUR)),
      };
    });
  }
  const days = range === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, index) => {
    const start = today - (days - 1 - index) * DAY;
    return {
      label: range === "7d" ? dayFormat.format(start) : dateFormat.format(start),
      detail: fullFormat.format(start),
      ...count(ledger.filter((entry) => entry.claimedAt >= start && entry.claimedAt < start + DAY)),
    };
  });
}

export function totals(series: ClaimBucket[]) {
  return series.reduce(
    (sum, item) => ({
      claimed: sum.claimed + item.claimed,
      paid: sum.paid + item.paid,
      expired: sum.expired + item.expired,
      awaiting: sum.awaiting + item.awaiting,
    }),
    { claimed: 0, paid: 0, expired: 0, awaiting: 0 },
  );
}

/** Claims by hour of day across the range. Shows when this pharmacy is most active. */
export function claimsByHour(entries: LedgerEntry[]) {
  return Array.from({ length: 24 }, (_, hour) => ({
    label: hour % 6 === 0 ? hourLabel(hour) : "",
    detail: `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`,
    value: entries.filter((entry) => new Date(entry.claimedAt).getHours() === hour).length,
  }));
}

export function topMedications(transactions: Transaction[]) {
  const counts = new Map<string, number>();
  for (const item of transactions) counts.set(item.medication, (counts.get(item.medication) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

/** Minutes the patient took to pay after this pharmacy claimed. */
export function timeToPayHistogram(transactions: Transaction[]) {
  const buckets: Array<[string, number, number]> = [
    ["< 5", 0, 5],
    ["5–15", 5, 15],
    ["15–30", 15, 30],
    ["30–45", 30, 45],
    ["45–60", 45, 61],
  ];
  return buckets.map(([label, from, to]) => ({
    label,
    detail: `${label} minutes`,
    value: transactions.filter((item) => item.timeToPayMs / 60_000 >= from && item.timeToPayMs / 60_000 < to).length,
  }));
}

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);
