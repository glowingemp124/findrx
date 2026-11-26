import { platformSettings } from "@/features/platform/platform-settings";
import { clientConfig } from "@/features/requests/config";
import type { BlindRequest, RequestPhase } from "@/features/requests/types";

/** Pure: the same request and clock always give the same phase, so timers survive a refresh. */
export function resolvePhase(request: BlindRequest, now: number): RequestPhase {
  if (request.postedAt === null) return "pending_verification";
  if (request.payment) return "connected";
  if (request.closedAt !== null) return "closed";
  if (request.claim) {
    return now >= request.claim.claimedAt + clientConfig.checkoutWindowMs ? "checkout_expired" : "pharmacy_found";
  }
  return now >= request.postedAt + clientConfig.queueWindowMs ? "no_match" : "live";
}

/** When the time-limited step of the current phase ends, or null if it has no deadline. */
export function phaseDeadline(request: BlindRequest): number | null {
  if (request.postedAt === null || request.payment || request.closedAt !== null) return null;
  if (request.claim) return request.claim.claimedAt + clientConfig.checkoutWindowMs;
  return request.postedAt + clientConfig.queueWindowMs;
}

/** Whether the request's data should already have been deleted. */
export function isPurgeable(request: BlindRequest, now: number): boolean {
  const phase = resolvePhase(request, now);
  const { verificationTtlMs, checkoutWindowMs } = clientConfig;
  const retentionMs = platformSettings.retentionMs();
  switch (phase) {
    case "pending_verification":
      return now >= request.createdAt + verificationTtlMs + retentionMs;
    case "connected":
      return now >= (request.payment?.paidAt ?? now) + retentionMs;
    case "closed":
      return now >= (request.closedAt ?? now) + retentionMs;
    case "checkout_expired":
      return now >= (request.claim?.claimedAt ?? now) + checkoutWindowMs + retentionMs;
    default:
      return false;
  }
}
