import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/types";
import { useClientTable } from "@/components/data-table/use-client-table";
import { buttonStyles } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { JoinRequestsPanel } from "@/features/admin/components/join-requests-panel";
import { ProfileChangeQueue } from "@/features/admin/components/profile-change-panel";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { NpiCheckBadge } from "@/features/admin/components/pharmacy-badges";
import { summarizeCheck, type NpiCheckSummary } from "@/features/admin/lib/npi-registry";
import { pharmacyReview } from "@/features/admin/services/pharmacy-review";
import { authService } from "@/features/auth/auth-service";
import type { PharmacyAccount, PharmacyStatus } from "@/features/auth/types";

const TABS: Array<{ key: string; label: string; statuses: PharmacyStatus[] }> = [
  { key: "pending", label: "Pending", statuses: ["pending", "info_requested"] },
  { key: "active", label: "Active", statuses: ["active"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
  { key: "suspended", label: "Suspended", statuses: ["suspended"] },
];

type Row = PharmacyAccount & { check: NpiCheckSummary };

const dateFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
const CHECK_ORDER = { not_run: 0, not_found: 1, mismatch: 2, match: 3 } as const;

export function PharmaciesPage() {
  const navigate = useNavigate();
  const account = adminAuth.useAccount();
  const [params] = useSearchParams();
  const tab = TABS.find((item) => item.key === params.get("status")) ?? TABS[0];
  const pharmacies = authService.useAllPharmacies();
  const reviews = pharmacyReview.useLog();

  const rows = useMemo<Row[]>(
    () =>
      pharmacies
        .filter((item) => tab.statuses.includes(item.status))
        .map((item) => ({ ...item, check: summarizeCheck(item, pharmacyReview.wasChecked(reviews, item.id)) })),
    [pharmacies, reviews, tab],
  );

  const columns: DataTableColumn<Row>[] = [
    {
      id: "pharmacy",
      header: "Pharmacy",
      sortValue: (row) => row.pharmacy.name,
      cell: (row) => (
        <div className="min-w-[160px]">
          <p className="font-semibold">{row.pharmacy.name}</p>
          <p className="text-sm text-muted">{[row.contactName, row.contactTitle].filter(Boolean).join(", ")}</p>
          <p className="text-sm text-muted sm:hidden">
            {row.pharmacy.city}, {row.pharmacy.state}
          </p>
        </div>
      ),
    },
    { id: "npi", header: "NPI", cell: (row) => <span className="tabular-nums">{row.pharmacy.npi}</span>, hideBelow: "md" },
    {
      id: "location",
      header: "Location",
      sortValue: (row) => `${row.pharmacy.city} ${row.pharmacy.state}`,
      cell: (row) => `${row.pharmacy.city}, ${row.pharmacy.state} ${row.pharmacy.zip}`,
      hideBelow: "sm",
    },
    { id: "applied", header: "Applied", sortValue: (row) => row.createdAt, cell: (row) => dateFormat.format(row.createdAt), hideBelow: "lg" },
    { id: "check", header: "NPI check", sortValue: (row) => CHECK_ORDER[row.check.kind], cell: (row) => <NpiCheckBadge summary={row.check} /> },
    {
      // Rows are clickable, so the button is a desktop convenience.
      id: "action",
      header: "",
      align: "right",
      hideBelow: "sm",
      cell: (row) => (
        <Link to={paths.admin.pharmacy(row.id)} onClick={(event) => event.stopPropagation()} className={buttonStyles({ size: "sm" })}>
          {tab.key === "pending" ? "Review" : "Open"}
        </Link>
      ),
    },
  ];

  const table = useClientTable(rows, {
    columns,
    searchText: (row) => `${row.pharmacy.name} ${row.pharmacy.npi} ${row.pharmacy.city} ${row.contactName} ${row.email}`,
    initialSort: { columnId: "applied", direction: tab.key === "pending" ? "asc" : "desc" },
    filters: [
      {
        id: "state",
        label: "Region",
        options: [
          { value: "", label: "All regions" },
          ...[...new Set(pharmacies.map((item) => item.pharmacy.state).filter(Boolean))].sort().map((value) => ({ value, label: value })),
        ],
        matches: (row, value) => row.pharmacy.state === value,
      },
      {
        id: "compounding",
        label: "Compounding",
        options: [
          { value: "", label: "Any service" },
          { value: "yes", label: "Compounds" },
          { value: "no", label: "Doesn't compound" },
        ],
        matches: (row, value) => row.pharmacy.canCompound === (value === "yes"),
      },
    ],
  });

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Pharmacies" subtitle="NPI verification queue, join requests, and profile changes waiting for review." />
      <JoinRequestsPanel />
      {account ? <ProfileChangeQueue adminName={account.name} /> : null}
      <SegmentedTabs
        label="Pharmacy status"
        activeKey={tab.key}
        items={TABS.map((item) => ({
          key: item.key,
          label: item.label,
          to: `?status=${item.key}`,
          count: pharmacies.filter((pharmacy) => item.statuses.includes(pharmacy.status)).length,
        }))}
      />
      <DataTable
        key={tab.key}
        label={`${tab.label} pharmacies`}
        table={table}
        columns={columns}
        getRowId={(row) => row.id}
        searchPlaceholder="Search name, NPI, city or contact"
        onRowClick={(row) => navigate(paths.admin.pharmacy(row.id))}
        emptyTitle={tab.key === "pending" ? "The review queue is empty" : `No ${tab.label.toLowerCase()} pharmacies`}
        emptyDescription={tab.key === "pending" ? "New sign-ups appear here for an NPI check." : "Try a different search or filter."}
      />
    </div>
  );
}
