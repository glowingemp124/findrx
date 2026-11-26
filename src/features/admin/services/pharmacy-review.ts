import { authService } from "@/features/auth/auth-service";
import type { PharmacyStatus } from "@/features/auth/types";
import { createPersistentStore } from "@/lib/persistent-store";

export type ReviewAction = "approved" | "rejected" | "info_requested" | "suspended" | "reinstated" | "reopened" | "npi_checked";

export type ReviewEntry = {
  id: string;
  pharmacyId: string;
  action: ReviewAction;
  note: string | null;
  by: string;
  at: number;
};

const log = createPersistentStore<ReviewEntry[]>("findrx-pharmacy-reviews", []);

/** Pharmacies whose NPI has been checked, and when. Cedar Lane is left unchecked on purpose. */
const SEEDED_CHECKS = ["pharmacy-riverbend", "pharmacy-northside", "pharmacy-eastgate", "pharmacy-bellaire", "pharmacy-harbor", "pharmacy-maple", "pharmacy-bayou", "pharmacy-gulf", "pharmacy-pine"];

const STATUS_FOR: Partial<Record<ReviewAction, PharmacyStatus>> = {
  approved: "active",
  rejected: "rejected",
  info_requested: "info_requested",
  suspended: "suspended",
  reinstated: "active",
  reopened: "pending",
};

export const ACTION_LABELS: Record<ReviewAction, string> = {
  approved: "Approved",
  rejected: "Rejected",
  info_requested: "Asked for more information",
  suspended: "Suspended",
  reinstated: "Reinstated",
  reopened: "Reopened for review",
  npi_checked: "Ran the NPI check",
};

/** Every decision on a pharmacy, recorded with who made it and when. */
export const pharmacyReview = {
  useLog: log.use,

  wasChecked(entries: ReviewEntry[], pharmacyId: string) {
    return SEEDED_CHECKS.includes(pharmacyId) || entries.some((entry) => entry.pharmacyId === pharmacyId && entry.action === "npi_checked");
  },

  record(pharmacyId: string, action: ReviewAction, note: string | null, by: string) {
    const entry: ReviewEntry = { id: crypto.randomUUID(), pharmacyId, action, note: note?.trim() || null, by, at: Date.now() };
    log.update((entries) => [entry, ...entries]);
    const status = STATUS_FOR[action];
    // The pharmacy sees the note on its status screen ("emailed" in a real system).
    if (status) authService.setStatus(pharmacyId, { status, note: status === "active" || status === "pending" ? null : entry.note });
  },
};
