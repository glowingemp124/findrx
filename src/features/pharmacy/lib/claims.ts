import { clientConfig } from "@/features/requests/config";
import type { BlindRequest, Fulfilment } from "@/features/requests/types";
import { medicationDetails } from "@/features/pharmacy/lib/feed";
import type { LedgerEntry } from "@/features/pharmacy/services/claim-ledger";

/** A claim as My claims shows it: the ledger entry joined with whatever of the request still exists. */
export type ClaimView = {
  entry: LedgerEntry;
  medication: string;
  details: string;
  fulfilment: Fulfilment | null;
  /** Checkout deadline while awaiting payment. */
  payBy: number;
  /** Only present once the patient has paid this pharmacy. */
  patient: { name: string; phone: string } | null;
};

export function toClaimView(entry: LedgerEntry, request: BlindRequest | undefined): ClaimView {
  const paidToMe = entry.outcome === "paid" && request?.payment && request.claim?.pharmacyId === entry.pharmacyId;
  return {
    entry,
    medication: request?.draft.medication.trim() ?? entry.medication ?? "Request details deleted",
    details: request ? medicationDetails(request) : "",
    fulfilment: request?.draft.fulfilment ?? null,
    payBy: entry.claimedAt + clientConfig.checkoutWindowMs,
    patient: paidToMe ? { name: request.draft.fullName.trim(), phone: request.draft.phone } : null,
  };
}

export const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};
