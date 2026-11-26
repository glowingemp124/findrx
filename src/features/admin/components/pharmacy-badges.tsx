import { Badge } from "@/components/ui/badge";
import type { PharmacyStatus } from "@/features/auth/types";
import type { NpiCheckSummary } from "@/features/admin/lib/npi-registry";

export const STATUS_LABELS: Record<PharmacyStatus, string> = {
  pending: "Pending",
  info_requested: "Info requested",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

const STATUS_TONES = { pending: "warn", info_requested: "warn", active: "good", rejected: "muted", suspended: "warn" } as const;

export function StatusBadge({ status }: { status: PharmacyStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function NpiCheckBadge({ summary }: { summary: NpiCheckSummary }) {
  switch (summary.kind) {
    case "match":
      return <Badge tone="good">Match</Badge>;
    case "mismatch":
      return <Badge tone="warn">{summary.count} mismatch{summary.count === 1 ? "" : "es"}</Badge>;
    case "not_found":
      return <Badge tone="warn">Not in registry</Badge>;
    case "not_run":
      return <Badge tone="muted">Not run</Badge>;
  }
}
