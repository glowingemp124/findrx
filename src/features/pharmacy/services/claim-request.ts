import type { SessionAccount } from "@/features/auth/types";
import { requestService, type ClaimResult } from "@/features/requests/services/request-service";
import { distanceBandFor, medicationDetails } from "@/features/pharmacy/lib/feed";
import { claimLedger } from "@/features/pharmacy/services/claim-ledger";

export const pharmacyAddress = ({ pharmacy }: SessionAccount) =>
  `${pharmacy.street}, ${pharmacy.city}, ${pharmacy.state} ${pharmacy.zip}`;

/** Claims a request for the signed-in pharmacy and records it in the ledger. */
export function claimRequest(account: SessionAccount, requestId: string): ClaimResult {
  const request = requestService.find(requestId);
  if (!request || account.status !== "active") return { ok: false, reason: "unavailable" };

  const result = requestService.claim(requestId, {
    pharmacyId: account.id,
    pharmacy: { name: account.pharmacy.name, address: pharmacyAddress(account), phone: account.pharmacy.phone },
    distanceBand: distanceBandFor(request, account.id),
  });

  if (result.ok) {
    const summary = [request.draft.medication.trim(), medicationDetails(request)].filter(Boolean).join(" · ");
    claimLedger.record(account.id, requestId, summary, result.claimedAt);
  }
  return result;
}
