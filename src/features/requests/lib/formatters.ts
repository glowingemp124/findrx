import type { BlindRequest, DistanceBand, Fulfilment, GenericPreference, MedicationForm } from "@/features/requests/types";

const FORM_LABELS: Record<MedicationForm, string> = {
  tablet: "Tablet",
  capsule: "Capsule",
  injection: "Injection",
  liquid: "Liquid",
  inhaler: "Inhaler",
  cream: "Cream",
  other: "Other",
};

const GENERIC_LABELS: Record<GenericPreference, string> = {
  yes: "Yes",
  no: "No",
  ask: "Check with pharmacist",
};

export const formLabel = (form: MedicationForm) => FORM_LABELS[form];
export const genericLabel = (value: GenericPreference) => GENERIC_LABELS[value];

export const fulfilmentLabel = (value: Fulfilment) =>
  value === "delivery" ? "Delivery requested" : "Pickup, anywhere in radius";

/** "Semaglutide · 200mg · Capsule · qty 10" */
export function summarizeMedication({ draft }: Pick<BlindRequest, "draft">) {
  const parts = [
    draft.medication.trim(),
    draft.dose.trim(),
    draft.form ? FORM_LABELS[draft.form] : "",
    draft.quantity.trim() ? `qty ${draft.quantity.trim()}` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

export function usDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** (555) 223-4567. Falls back to the raw text when it isn't a full US number. */
export function formatUsPhone(value: string) {
  const digits = usDigits(value);
  if (digits.length !== 10) return value;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** US numbers as (713) 555-0199. Anything else keeps its country code. */
export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return formatUsPhone(digits);
  if (digits.length === 11 && digits.startsWith("1")) return `+1 ${formatUsPhone(digits.slice(1))}`;
  return digits ? `+${digits}` : value;
}

/** Same handset, whether or not the stored value includes a leading country code. */
export function samePhone(a: string, b: string) {
  const left = a.replace(/\D/g, "");
  const right = b.replace(/\D/g, "");
  if (!left || !right) return false;
  if (left === right) return true;
  const national = (digits: string) => (digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits);
  return national(left) === national(right);
}

/** 754000 ms -> "12:34". Rolls to hours past 60 minutes: "1:00:00". */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatClockTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

/** "1 to 3 miles" or "under 1 mile". Pass `short` for "1 to 3 mi". */
export function formatDistanceBand({ minMiles, maxMiles }: DistanceBand, short = false) {
  const unit = short ? "mi" : maxMiles === 1 ? "mile" : "miles";
  return minMiles === 0 ? `${short ? "Under" : "under"} ${maxMiles} ${unit}` : `${minMiles} to ${maxMiles} ${unit}`;
}

/** "Just now", "4 min ago", "2 h ago". */
export function formatTimeAgo(timestamp: number, now: number) {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}
