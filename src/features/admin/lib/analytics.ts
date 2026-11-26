import { median } from "@/lib/math";
import type { Transaction } from "@/features/requests/services/transaction-store";
import type { BlindRequest } from "@/features/requests/types";

export type RangeKey = "today" | "7d" | "30d";

export const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

export type Bucket = {
  start: number;
  label: string;
  detail: string;
  searches: number;
  claimed: number;
  paid: number;
  expired: number;
  noMatch: number;
  refunds: number;
};

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

/** Share of a day's searches by hour: quiet overnight, peaks late morning and after work. */
const HOURLY = [1, 0.6, 0.4, 0.3, 0.4, 0.8, 1.8, 3.4, 5.2, 6.6, 7.2, 7, 6.4, 6.2, 6, 5.8, 6.1, 6.8, 7.1, 6.3, 4.9, 3.6, 2.4, 1.6];
const HOURLY_TOTAL = HOURLY.reduce((sum, value) => sum + value, 0);

/** Mock medication mix for "most requested". */
const MEDICATION_MIX: Array<[string, number]> = [
  ["Semaglutide (Ozempic, Wegovy)", 0.17],
  ["Adderall / amphetamine salts", 0.13],
  ["Amoxicillin", 0.09],
  ["Albuterol inhaler", 0.08],
  ["Insulin glargine", 0.07],
  ["Methylphenidate (Ritalin)", 0.06],
  ["Estradiol", 0.05],
  ["Levothyroxine", 0.04],
];

const startOfDay = (time: number) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** Small deterministic noise per day, so the sample data is stable across renders and reloads. */
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Mock traffic for one day (or the part of today that has passed). */
function sampleDay(dayStart: number, fraction = 1): Omit<Bucket, "start" | "label" | "detail"> {
  const seed = dayStart / DAY;
  const weekday = new Date(dayStart).getDay();
  const weekFactor = weekday === 0 ? 0.78 : weekday === 6 ? 0.86 : 1 + (weekday === 5 ? 0.08 : 0);
  const searches = Math.round((150 + noise(seed) * 70) * weekFactor * fraction);
  const claimed = Math.round(searches * (0.56 + noise(seed + 1) * 0.12));
  const paid = Math.round(claimed * (0.76 + noise(seed + 2) * 0.1));
  const refunds = noise(seed + 3) > 0.62 ? Math.max(0, Math.round(paid * 0.012)) + (noise(seed + 4) > 0.5 ? 1 : 0) : 0;
  return { searches, claimed, paid, expired: claimed - paid, noMatch: searches - claimed, refunds };
}

/** Real client requests (not simulated) posted in a window, added on top of the sample. */
function realCounts(requests: BlindRequest[], from: number, to: number) {
  const inWindow = requests.filter((request) => !request.simulated && request.postedAt !== null && request.postedAt >= from && request.postedAt < to);
  return {
    searches: inWindow.length,
    claimed: inWindow.filter((request) => request.claim || request.payment || request.releasedClaims.length).length,
    paid: inWindow.filter((request) => request.payment).length,
  };
}

function bucket(start: number, end: number, label: string, detail: string, base: Omit<Bucket, "start" | "label" | "detail">, requests: BlindRequest[]): Bucket {
  const real = realCounts(requests, start, end);
  return {
    ...base,
    start,
    label,
    detail,
    searches: base.searches + real.searches,
    claimed: base.claimed + real.claimed,
    paid: base.paid + real.paid,
  };
}

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

/** Buckets for a range: hours for today, days otherwise. `offset` 1 gives the previous period. */
export function buildSeries(range: RangeKey, now: number, requests: BlindRequest[], offset = 0): Bucket[] {
  const today = startOfDay(now);
  if (range === "today") {
    const dayStart = today - offset * DAY;
    const hoursSoFar = offset === 0 ? new Date(now).getHours() + 1 : 24;
    const daily = sampleDay(dayStart);
    return Array.from({ length: hoursSoFar }, (_, hour) => {
      const share = HOURLY[hour] / HOURLY_TOTAL;
      const scale = (value: number) => Math.round(value * share);
      const label = `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;
      return bucket(dayStart + hour * HOUR, dayStart + (hour + 1) * HOUR, label, `${label}m`, {
        searches: scale(daily.searches),
        claimed: scale(daily.claimed),
        paid: scale(daily.paid),
        expired: scale(daily.expired),
        noMatch: scale(daily.noMatch),
        refunds: hour === 14 ? daily.refunds : 0,
      }, requests);
    });
  }
  const days = range === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, index) => {
    const start = today - (days - 1 - index + offset * days) * DAY;
    const isToday = start === today;
    const fraction = isToday ? (now - today) / DAY : 1;
    const label = range === "7d" ? dayFormat.format(start) : dateFormat.format(start);
    return bucket(start, start + DAY, label, fullFormat.format(start), sampleDay(start, fraction), requests);
  });
}

export type Totals = Omit<Bucket, "start" | "label" | "detail">;

export function totalsOf(series: Bucket[]): Totals {
  return series.reduce(
    (sum, item) => ({
      searches: sum.searches + item.searches,
      claimed: sum.claimed + item.claimed,
      paid: sum.paid + item.paid,
      expired: sum.expired + item.expired,
      noMatch: sum.noMatch + item.noMatch,
      refunds: sum.refunds + item.refunds,
    }),
    { searches: 0, claimed: 0, paid: 0, expired: 0, noMatch: 0, refunds: 0 },
  );
}

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** Requests by hour of day across the range. */
export function hourlyProfile(totals: Totals) {
  return HOURLY.map((weight, hour) => ({
    label: hour % 6 === 0 ? `${hour % 12 || 12}${hour < 12 ? "a" : "p"}` : "",
    detail: `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`,
    value: Math.round((totals.searches * weight) / HOURLY_TOTAL),
  }));
}

export function topMedications(totals: Totals) {
  return MEDICATION_MIX.map(([label, share]) => ({ label, value: Math.round(totals.searches * share) }));
}

export function rangeStart(range: RangeKey, now: number) {
  const today = startOfDay(now);
  return range === "today" ? today : today - ((range === "7d" ? 7 : 30) - 1) * DAY;
}

/** Real transactions (including seeded history) in the range. */
export const transactionsIn = (transactions: Transaction[], from: number) => transactions.filter((item) => item.paidAt >= from);

export { median };

const CLAIM_BUCKETS: Array<[string, number, number]> = [
  ["< 5", 0, 5],
  ["5–10", 5, 10],
  ["10–15", 10, 15],
  ["15–20", 15, 20],
  ["20–30", 20, 30],
  ["30+", 30, Infinity],
];

/** Minutes from posting to a pharmacy's claim, bucketed. */
export function claimTimeHistogram(transactions: Transaction[]) {
  return CLAIM_BUCKETS.map(([label, from, to]) => ({
    label,
    detail: `${label} minutes`,
    value: transactions.filter((item) => item.timeToClaimMs / 60_000 >= from && item.timeToClaimMs / 60_000 < to).length,
  }));
}

export function topPharmacies(transactions: Transaction[]) {
  const byPharmacy = new Map<string, { label: string; paid: number; revenueCents: number }>();
  for (const item of transactions) {
    if (item.status !== "paid") continue;
    const entry = byPharmacy.get(item.pharmacyId) ?? { label: item.pharmacyName, paid: 0, revenueCents: 0 };
    entry.paid += 1;
    entry.revenueCents += item.amountCents;
    byPharmacy.set(item.pharmacyId, entry);
  }
  return [...byPharmacy.values()].sort((a, b) => b.paid - a.paid).slice(0, 6);
}

/** Daily figures as CSV, for "Export CSV". */
export function toCsv(series: Bucket[], feeCents: number) {
  const header = ["Period", "Searches", "Claimed", "Paid", "Payment expired", "No match", "Refunds", "Revenue (USD)"];
  const rows = series.map((item) => [
    item.detail,
    item.searches,
    item.claimed,
    item.paid,
    item.expired,
    item.noMatch,
    item.refunds,
    ((item.paid * feeCents) / 100).toFixed(2),
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}
