import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/lib/toast";
import { ClaimDialog } from "@/features/pharmacy/components/claim-dialog";
import { EmptyState } from "@/features/pharmacy/components/empty-state";
import { LiveDot, PageHeader } from "@/features/pharmacy/components/page-header";
import { RequestCard } from "@/features/pharmacy/components/request-card";
import { StatCard } from "@/features/pharmacy/components/stat-card";
import { pharmacyConfig } from "@/features/pharmacy/config";
import { usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";
import type { FeedItem } from "@/features/pharmacy/lib/feed";
import { claimRequest } from "@/features/pharmacy/services/claim-request";
import { matchesStock, stockList } from "@/features/pharmacy/services/stock-list";
import { requestFee, requestService } from "@/features/requests/services/request-service";

const CLAIM_ERRORS = {
  taken: "Another pharmacy claimed this one first.",
  unavailable: "This request is no longer open.",
} as const;

export function LiveRequestsPage() {
  const { account, feed, stats, now, claimBlock } = usePharmacyWorkspace();
  const { push } = useToast();
  const navigate = useNavigate();
  const stock = stockList.use(account.id);
  const [claiming, setClaiming] = useState<FeedItem | null>(null);

  const confirmClaim = (item: FeedItem) => {
    const result = claimRequest(account, item.id);
    if (!result.ok) return CLAIM_ERRORS[result.reason];
    setClaiming(null);
    const posted = requestService.find(item.id);
    const free = posted ? requestFee(posted) === 0 : false;
    push(`Claimed ${item.medication}`, {
      description: free
        ? "The patient is connected now. Their details are on Connected."
        : "The patient has 1 hour to connect. You'll see their details once they do.",
    });
    navigate(free ? paths.pharmacy.claimsTab("paid") : paths.pharmacy.claimsTab("awaiting"));
    return null;
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Live requests"
        adornment={account.acceptingRequests ? <LiveDot /> : null}
        subtitle="Anonymous Blind Requests within your area, newest first. First pharmacy to claim gets it."
        action={
          <Link to={paths.pharmacy.settings}>
            <Badge tone={account.acceptingRequests ? "good" : "warn"}>
              {account.acceptingRequests ? "Accepting requests" : "Paused"}
            </Badge>
          </Link>
        }
      />

      <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Open near you" value={feed.length} />
        <StatCard label="Waiting to connect" value={stats.awaitingPayment} delay={60} />
        <StatCard label="Claims this hour" value={stats.claimsThisHour} limit={pharmacyConfig.maxClaimsPerHour} delay={120} />
        <StatCard label="Claims today" value={stats.claimsToday} limit={pharmacyConfig.maxClaimsPerDay} delay={180} />
      </section>

      {claimBlock ? (
        <Notice tone="warn" icon="pause">
          {claimBlock}
        </Notice>
      ) : null}

      <section aria-label="Open requests" className="grid gap-3">
        {feed.length === 0 ? (
          <EmptyState icon="inbox" title="No open requests right now">
            New requests appear here the moment a patient posts one. Keep this page open; we'll let you know.
          </EmptyState>
        ) : (
          feed.map((item, index) => (
            <RequestCard
              key={item.id}
              item={item}
              now={now}
              disabled={claimBlock !== null}
              onClaim={setClaiming}
              onList={matchesStock(item.medication, stock)}
              delay={Math.min(index, 6) * 50}
            />
          ))
        )}
      </section>

      <ClaimDialog item={claiming} onCancel={() => setClaiming(null)} onConfirm={confirmClaim} />
    </div>
  );
}
