import type { SessionAccount } from "@/features/auth/types";
import { milesBetween, pointForId } from "@/features/client/lib/pharmacy-coverage";
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

function bandForMiles(miles: number): DistanceBand {
  const match = BANDS.find((band) => miles <= band.maxMiles);
  if (match) return match;
  const ceiling = Math.max(1, Math.ceil(miles));
  return { minMiles: Math.floor(miles), maxMiles: ceiling };
}

/**
 * Distance band for a pharmacy. Uses the map pin when the request has one.
 */
export function distanceBandFor(request: BlindRequest, pharmacyId: string): DistanceBand {
  const { latitude, longitude, radiusMiles } = request.draft;
  const point = latitude != null && longitude != null ? pointForId(pharmacyId) : null;
  if (point && latitude != null && longitude != null) {
    return bandForMiles(milesBetween(point, { lat: latitude, lng: longitude }));
  }
  const options = BANDS.filter((band) => band.maxMiles <= radiusMiles);
  const fallback = options.length > 0 ? options : BANDS;
  return fallback[hash(request.id + pharmacyId) % fallback.length];
}

function insideSearch(request: BlindRequest, pharmacyId: string) {
  const { latitude, longitude, radiusMiles } = request.draft;
  if (radiusMiles <= 0) return true;
  if (latitude == null || longitude == null) return true;
  const point = pointForId(pharmacyId);
  if (!point) return false;
  return milesBetween(point, { lat: latitude, lng: longitude }) <= radiusMiles;
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
    .filter((request) => insideSearch(request, account.id))
    .map((request) => toFeedItem(request, account.id))
    .sort((a, b) => b.postedAt - a.postedAt);
}
