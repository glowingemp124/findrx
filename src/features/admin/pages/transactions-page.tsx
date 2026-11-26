import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/types";
import { useClientTable } from "@/components/data-table/use-client-table";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { TransactionModal } from "@/features/admin/components/transaction-modal";
import { can } from "@/features/admin/lib/permissions";
import { formatUsd } from "@/features/requests/lib/formatters";
import { formatPaymentMethod } from "@/features/requests/services/payment-gateway";
import { requestService } from "@/features/requests/services/request-service";
import { transactionStore, type Transaction } from "@/features/requests/services/transaction-store";
import { downloadText } from "@/lib/download";

const timeFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function buildColumns(onView: (row: Transaction) => void): DataTableColumn<Transaction>[] {
  return [
  {
    id: "transaction",
    header: "Transaction",
    sortValue: (row) => row.paidAt,
    cell: (row) => (
      <div className="whitespace-nowrap">
        <p className="font-semibold tabular-nums">{row.id}</p>
        <p className="text-sm text-muted">{timeFormat.format(row.paidAt)}</p>
      </div>
    ),
  },
  {
    id: "pharmacy",
    header: "Pharmacy",
    sortValue: (row) => row.pharmacyName,
    cell: (row) => (
      <div className="min-w-[150px]">
        <p className="font-medium">{row.pharmacyName}</p>
        {/* Medication folds under the pharmacy on phones, where its own column is hidden. */}
        <p className="text-sm text-muted sm:hidden">{row.medication}</p>
      </div>
    ),
  },
  {
    id: "medication",
    header: "Medication",
    sortValue: (row) => row.medication,
    cell: (row) => <span className="block min-w-[140px] max-w-[260px]">{row.medication}</span>,
    hideBelow: "sm",
  },
  { id: "reference", header: "Request", cell: (row) => <span className="whitespace-nowrap tabular-nums text-ink-2">{row.reference}</span>, hideBelow: "lg" },
  {
    id: "fulfilment",
    header: "Fulfilment",
    cell: (row) => (row.fulfilment === "delivery" ? "Delivery" : "Pickup"),
    hideBelow: "lg",
  },
  { id: "method", header: "Method", cell: (row) => <span className="whitespace-nowrap">{formatPaymentMethod(row.method)}</span>, hideBelow: "md" },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    sortValue: (row) => row.amountCents,
    cell: (row) => <span className="font-semibold tabular-nums">{formatUsd(row.amountCents)}</span>,
    hideBelow: "sm",
  },
  {
    id: "status",
    header: "Status",
    sortValue: (row) => row.status,
    cell: (row) => <Badge tone={row.status === "paid" ? "good" : "warn"}>{row.status === "paid" ? "Paid" : "Refunded"}</Badge>,
  },
  {
    id: "actions",
    header: "Actions",
    headerAlign: "center",
    cell: (row) => (
      <div className="flex justify-center">
        <IconButton
          size="sm"
          label={`View ${row.id}`}
          title="View details"
          onClick={(event) => {
            event.stopPropagation();
            onView(row);
          }}
        >
          <Icon name="eye" className="size-4" />
        </IconButton>
      </div>
    ),
  },
  ];
}

function toCsv(rows: Transaction[]) {
  const header = ["Transaction", "Paid at", "Pharmacy", "Medication", "Request", "Fulfilment", "Method", "Amount (USD)", "Status", "Refund reason"];
  const lines = rows.map((row) => [
    row.id,
    new Date(row.paidAt).toISOString(),
    row.pharmacyName,
    row.medication,
    row.reference,
    row.fulfilment,
    formatPaymentMethod(row.method),
    (row.amountCents / 100).toFixed(2),
    row.status,
    row.refund?.reason ?? "",
  ]);
  return [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function TransactionsPage() {
  const account = adminAuth.useAccount();
  const transactions = transactionStore.use();
  const requests = requestService.use();
  const [openId, setOpenId] = useState<string | null>(null);
  const columns = useMemo(() => buildColumns((row) => setOpenId(row.id)), []);

  const pharmacies = useMemo(
    () => [...new Set(transactions.map((item) => item.pharmacyName))].sort().map((name) => ({ value: name, label: name })),
    [transactions],
  );

  const table = useClientTable(transactions, {
    columns,
    initialSort: { columnId: "transaction", direction: "desc" },
    searchText: (row) => `${row.id} ${row.pharmacyName} ${row.medication} ${row.reference} ${row.stripePaymentId}`,
    filters: [
      {
        id: "status",
        label: "Status",
        options: [
          { value: "", label: "All statuses" },
          { value: "paid", label: "Paid" },
          { value: "refunded", label: "Refunded" },
        ],
        matches: (row, value) => row.status === value,
      },
      {
        id: "method",
        label: "Method",
        options: [
          { value: "", label: "All methods" },
          { value: "card", label: "Card" },
          { value: "apple_pay", label: "Apple Pay" },
          { value: "google_pay", label: "Google Pay" },
        ],
        matches: (row, value) => row.method.kind === value,
      },
      { id: "pharmacy", label: "Pharmacy", options: [{ value: "", label: "All pharmacies" }, ...pharmacies], matches: (row, value) => row.pharmacyName === value },
    ],
  });

  if (!account) return null;
  const open = transactions.find((item) => item.id === openId) ?? null;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Transactions"
        subtitle="Search by transaction ID, pharmacy or medication. Patient details disappear after the purge."
      />
      <DataTable
        label="Transactions"
        table={table}
        columns={columns}
        getRowId={(row) => row.id}
        searchPlaceholder="Search e.g. TXN-48213 or Riverbend"
        onRowClick={(row) => setOpenId(row.id)}
        selectedRowId={openId}
        emptyTitle="No transactions match"
        emptyDescription="Try a different search or clear the filters."
        actions={
          <Button icon={<Icon name="download" className="size-4" />} onClick={() => downloadText("findrx-transactions.csv", toCsv(transactions))}>
            Export CSV
          </Button>
        }
      />
      <TransactionModal
        transaction={open}
        request={open ? requests.find((request) => request.id === open.requestId) : undefined}
        canRefund={can(account, "refunds")}
        adminName={account.name}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
