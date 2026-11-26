import { Navigate, useParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { AwaitingClaimCard, ExpiredClaimCard, PaidClaimCard } from "@/features/pharmacy/components/claim-cards";
import { EmptyState } from "@/features/pharmacy/components/empty-state";
import { PageHeader } from "@/features/pharmacy/components/page-header";
import { usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";

const TABS = [
  { id: "awaiting", label: "Awaiting payment", empty: "Nothing waiting. Claims show here until the patient pays." },
  { id: "paid", label: "Paid · contact customer", empty: "No paid claims yet today. Patient details appear here once they pay." },
  { id: "expired", label: "Expired", empty: "No expired claims today." },
] as const;

type TabId = (typeof TABS)[number]["id"];

const isTab = (value: string | undefined): value is TabId => TABS.some((tab) => tab.id === value);

export function MyClaimsPage() {
  const { tab } = useParams();
  const { claims, now } = usePharmacyWorkspace();

  if (!isTab(tab)) {
    // Land on whichever list needs attention first.
    const first = claims.paid.some((view) => view.entry.contactedAt === null) ? "paid" : "awaiting";
    return <Navigate to={paths.pharmacy.claimsTab(first)} replace />;
  }

  const views = claims[tab];
  const active = TABS.find((item) => item.id === tab)!;

  return (
    <div className="grid gap-6">
      <PageHeader title="My claims" subtitle="Requests you claimed today. Patient details appear once they pay." />

      <SegmentedTabs
        label="Claim status"
        activeKey={tab}
        items={TABS.map((item) => ({ key: item.id, label: item.label, to: paths.pharmacy.claimsTab(item.id), count: claims[item.id].length }))}
      />

      <section aria-label={active.label} className="grid gap-3">
        {views.length === 0 ? (
          <EmptyState icon="clipboardCheck" title={active.empty} />
        ) : (
          views.map((view) =>
            tab === "awaiting" ? (
              <AwaitingClaimCard key={view.entry.id} view={view} now={now} />
            ) : tab === "paid" ? (
              <PaidClaimCard key={view.entry.id} view={view} />
            ) : (
              <ExpiredClaimCard key={view.entry.id} view={view} />
            ),
          )
        )}
      </section>
    </div>
  );
}
