import type { SessionAccount } from "@/features/auth/types";
import { formLabel } from "@/features/requests/lib/formatters";
import { resolvePhase } from "@/features/requests/lib/request-phase";
import type { BlindRequest, DistanceBand, Fulfilment, GenericPreference } from "@/features/requests/types";

/** What a pharmacy may see about a request before the patient pays. No name, phone or area. */
export type FeedItem = {
  id: string;
  medication: string;
  details: string;
  genericPreference: GenericPreference;
  manufacturer: string;
  fulfilment: Fulfilment;
  needsCompounding: boolean;
  distanceBand: DistanceBand;
  postedAt: number;
};

const BANDS: DistanceBand[] = [
  { minMiles: 0, maxMiles: 1 },
  { minMiles: 1, maxMiles: 3 },
  { minMiles: 3, maxMiles: 5 },
  { minMiles: 5, maxMiles: 10 },
  { minMiles: 10, maxMiles: 25 },
  { minMiles: 25, maxMiles: 50 },
];

const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

/**
 * Mock distance between a pharmacy and a patient, as a band inside the patient's radius.
 * Deterministic so it doesn't change between renders. Real geocoding replaces this.
 */
export function distanceBandFor(request: BlindRequest, pharmacyId: string): DistanceBand {
  const options = BANDS.filter((band) => band.maxMiles <= request.draft.radiusMiles);
  return options[hash(request.id + pharmacyId) % options.length];
}

/** "500 mg ER · Tablet · Qty 60" */
export function medicationDetails({ draft }: BlindRequest) {
  return [draft.dose.trim(), draft.form ? formLabel(draft.form) : "", draft.quantity ? `Qty ${draft.quantity}` : ""]
    .filter(Boolean)
    .join(" · ");
}

export function toFeedItem(request: BlindRequest, pharmacyId: string): FeedItem {
  const { draft } = request;
  return {
    id: request.id,
    medication: draft.medication.trim(),
    details: medicationDetails(request),
    genericPreference: draft.genericPreference,
    manufacturer: draft.manufacturer.trim(),
    fulfilment: draft.fulfilment,
    needsCompounding: draft.needsCompounding,
    distanceBand: distanceBandFor(request, pharmacyId),
    postedAt: request.postedAt ?? request.createdAt,
  };
}

/** Open requests this pharmacy can claim, newest first. Compounding requests only reach compounders. */
export function buildFeed(requests: BlindRequest[], account: SessionAccount, now: number): FeedItem[] {
  return requests
    .filter((request) => resolvePhase(request, now) === "live")
    .filter((request) => !request.draft.needsCompounding || account.pharmacy.canCompound)
    .map((request) => toFeedItem(request, account.id))
    .sort((a, b) => b.postedAt - a.postedAt);
}
