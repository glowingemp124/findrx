import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { authService } from "@/features/auth/auth-service";
import type { SessionAccount } from "@/features/auth/types";
import { requestService } from "@/features/requests/services/request-service";
import { pharmacyConfig } from "@/features/pharmacy/config";
import { buildFeed, type FeedItem } from "@/features/pharmacy/lib/feed";
import { startOfDay, toClaimView, type ClaimView } from "@/features/pharmacy/lib/claims";
import { claimLedger, SEEDED_HISTORY_PHARMACIES, type LedgerEntry } from "@/features/pharmacy/services/claim-ledger";
import { transactionStore } from "@/features/requests/services/transaction-store";
import { advancePatientSimulation, startPatientSimulation } from "@/features/pharmacy/services/patient-simulation";
import { useToast } from "@/lib/toast";
import { useNow } from "@/lib/use-now";

export type PharmacyWorkspace = {
  account: SessionAccount;
  now: number;
  feed: FeedItem[];
  claims: Record<"awaiting" | "paid" | "expired", ClaimView[]>;
  /** Every ledger entry for this pharmacy, newest first. */
  ledger: LedgerEntry[];
  /** `needsAttention` = awaiting payment + paid but not yet contacted; it drives the My claims badge. */
  stats: { claimsThisHour: number; claimsToday: number; awaitingPayment: number; toContact: number; needsAttention: number };
  /** Why claiming is blocked right now, or null when it's allowed. */
  claimBlock: string | null;
};

const WorkspaceContext = createContext<PharmacyWorkspace | null>(null);

const HOUR = 60 * 60_000;

/** One clock and one subscription for every pharmacy page. Also runs the mock patient network. */
export function PharmacyWorkspaceProvider({ account, children }: { account: SessionAccount; children: ReactNode }) {
  const now = useNow(1000);
  const requests = requestService.use();
  const ledgerEntries = claimLedger.use();
  const { push } = useToast();

  useEffect(() => {
    if (SEEDED_HISTORY_PHARMACIES.includes(account.id)) claimLedger.seedHistory(account.id, Date.now());
    transactionStore.seedHistory(Date.now());
    return startPatientSimulation();
  }, [account.id]);

  useEffect(() => {
    advancePatientSimulation(now);
    requestService.purgeExpired(now);
    claimLedger.reconcile(requestService.all(), now);
  }, [now]);

  const workspace = useMemo<PharmacyWorkspace>(() => {
    const feed = buildFeed(requests, account, now);
    const ledger = ledgerEntries.filter((entry) => entry.pharmacyId === account.id).sort((a, b) => b.claimedAt - a.claimedAt);
    const today = ledger.filter((entry) => entry.claimedAt >= startOfDay(now));
    const views = today.map((entry) => toClaimView(entry, requests.find((request) => request.id === entry.requestId)));
    const claims = {
      awaiting: views.filter((view) => view.entry.outcome === "awaiting_payment"),
      paid: views.filter((view) => view.entry.outcome === "paid"),
      expired: views.filter((view) => view.entry.outcome === "expired"),
    };
    const claimsThisHour = ledger.filter((entry) => entry.claimedAt > now - HOUR).length;
    const claimsToday = today.length;
    const claimBlock = !account.acceptingRequests
      ? "You've paused new requests. Turn them back on in Settings to claim."
      : claimsThisHour >= pharmacyConfig.maxClaimsPerHour
        ? `You've reached ${pharmacyConfig.maxClaimsPerHour} claims this hour.`
        : claimsToday >= pharmacyConfig.maxClaimsPerDay
          ? `You've reached ${pharmacyConfig.maxClaimsPerDay} claims today.`
          : null;
    return {
      account,
      now,
      feed,
      claims,
      ledger,
      stats: {
        claimsThisHour,
        claimsToday,
        awaitingPayment: claims.awaiting.length,
        toContact: claims.paid.filter((view) => view.entry.contactedAt === null).length,
        needsAttention: claims.awaiting.length + claims.paid.filter((view) => view.entry.contactedAt === null).length,
      },
      claimBlock,
    };
  }, [account, ledgerEntries, now, requests]);

  // Announce requests that arrive while the dashboard is open.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = workspace.feed.map((item) => item.id);
    if (seen.current && account.acceptingRequests) {
      const arrived = workspace.feed.filter((item) => !seen.current!.has(item.id));
      if (arrived.length === 1) push(`New request: ${arrived[0].medication}`, { tone: "info", description: "It's at the top of Live requests." });
      else if (arrived.length > 1) push(`${arrived.length} new requests`, { tone: "info" });
    }
    seen.current = new Set([...(seen.current ?? []), ...ids]);
  }, [workspace.feed, account.acceptingRequests, push]);

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function usePharmacyWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("usePharmacyWorkspace must be used inside PharmacyWorkspaceProvider");
  return workspace;
}

/** The signed-in account, for the shell that wraps the provider. */
export const useSignedInPharmacy = () => authService.useAccount();
