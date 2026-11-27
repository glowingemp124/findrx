import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/types";
import { useClientTable } from "@/components/data-table/use-client-table";
import { Badge } from "@/components/ui/badge";
import { formatClockTime } from "@/features/requests/lib/formatters";
import { PageHeader } from "@/features/pharmacy/components/page-header";
import { usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";
import { startOfDay } from "@/features/pharmacy/lib/claims";
import type { ClaimOutcome, LedgerEntry } from "@/features/pharmacy/services/claim-ledger";

const DAY = 24 * 60 * 60_000;

const OUTCOME_BADGE: Record<ClaimOutcome, ReactNode> = {
  awaiting_payment: <Badge tone="warn">Waiting to connect</Badge>,
  paid: <Badge tone="good">Connected</Badge>,
  expired: <Badge tone="muted">Payment expired</Badge>,
};

function dayLabel(dayStart: number, todayStart: number) {
  if (dayStart === todayStart - DAY) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(dayStart);
}

type DayCount = { dayStart: number; claimed: number; paid: number; expired: number };

function countByDay(entries: LedgerEntry[]): DayCount[] {
  const days = new Map<number, DayCount>();
  for (const entry of entries) {
    const dayStart = startOfDay(entry.claimedAt);
    const day = days.get(dayStart) ?? { dayStart, claimed: 0, paid: 0, expired: 0 };
    day.claimed += 1;
    if (entry.outcome === "paid") day.paid += 1;
    if (entry.outcome === "expired") day.expired += 1;
    days.set(dayStart, day);
  }
  return [...days.values()].sort((a, b) => b.dayStart - a.dayStart);
}

type DayRow = DayCount & { label: string };

const todayColumns: DataTableColumn<LedgerEntry>[] = [
  { id: "time", header: "Today", sortValue: (row) => row.claimedAt, cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatClockTime(row.claimedAt)}</span> },
  { id: "medication", header: "Medication", sortValue: (row) => row.medication ?? "", cell: (row) => row.medication ?? "Details deleted" },
  { id: "status", header: "Status", sortValue: (row) => row.outcome, cell: (row) => OUTCOME_BADGE[row.outcome] },
  { id: "transaction", header: "Transaction", cell: (row) => <span className="tabular-nums">{row.transactionId ?? "–"}</span>, hideBelow: "sm" },
];

const dayColumns: DataTableColumn<DayRow>[] = [
  { id: "day", header: "Day", sortValue: (row) => row.dayStart, cell: (row) => row.label },
  { id: "claimed", header: "Claimed", align: "right", sortValue: (row) => row.claimed, cell: (row) => <span className="tabular-nums">{row.claimed}</span> },
  { id: "paid", header: "Connected", align: "right", sortValue: (row) => row.paid, cell: (row) => <span className="tabular-nums">{row.paid}</span> },
  { id: "expired", header: "Payment expired", align: "right", sortValue: (row) => row.expired, cell: (row) => <span className="tabular-nums">{row.expired}</span> },
];

export function HistoryPage() {
  const { ledger, now } = usePharmacyWorkspace();
  const todayStart = startOfDay(now);
  const today = ledger.filter((entry) => entry.claimedAt >= todayStart);
  const earlier = countByDay(ledger.filter((entry) => entry.claimedAt < todayStart)).map((day) => ({
    ...day,
    label: dayLabel(day.dayStart, todayStart),
  }));

  const todayTable = useClientTable(today, {
    columns: todayColumns,
    initialSort: { columnId: "time", direction: "desc" },
    searchText: (row) => `${row.medication ?? ""} ${row.transactionId ?? ""}`,
    filters: [
      {
        id: "status",
        label: "Status",
        options: [
          { value: "", label: "All statuses" },
          { value: "awaiting_payment", label: "Waiting to connect" },
          { value: "paid", label: "Connected" },
          { value: "expired", label: "Payment expired" },
        ],
        matches: (row, value) => row.outcome === value,
      },
    ],
  });
  const dayTable = useClientTable(earlier, { columns: dayColumns, initialSort: { columnId: "day", direction: "desc" } });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="History"
        subtitle="Claims you've made, including earlier days. Patient details stay on the claim."
      />
      <DataTable
        label="Today's claims"
        table={todayTable}
        columns={todayColumns}
        getRowId={(row) => row.id}
        searchPlaceholder="Search medication or transaction"
        emptyTitle={today.length === 0 ? "No claims yet today" : "No claims match"}
        emptyDescription={today.length === 0 ? "Claims you make today are listed here with their outcome." : "Try a different search or filter."}
      />
      {earlier.length > 0 ? (
        <DataTable label="Earlier days" table={dayTable} columns={dayColumns} getRowId={(row) => String(row.dayStart)} />
      ) : null}
    </div>
  );
}
