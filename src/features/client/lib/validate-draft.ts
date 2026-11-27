import { usDigits } from "@/features/requests/lib/formatters";
import type { RequestDraft } from "@/features/requests/types";

export type DraftField = keyof RequestDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

/** A city, postal code, or place name from any country. */
export function isPlausibleArea(value: string) {
  return value.trim().length >= 2;
}

/** Letters from any language. An empty name is allowed. */
export function isPersonName(value: string) {
  return /^[\p{L}][\p{L}' .-]*$/u.test(value);
}

/** US numbers only: 10 digits, and area and exchange codes can't start with 0 or 1. */
export function isUsMobile(value: string) {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(usDigits(value));
}

export function validateDraft(draft: RequestDraft): DraftErrors {
  const errors: DraftErrors = {};
  const quantity = Number(draft.quantity);

  if (draft.medication.trim().length < 2) errors.medication = "Enter the medication name.";
  if (!draft.form) errors.form = "Choose a form.";
  if (!draft.quantity.trim()) errors.quantity = "Enter a quantity.";
  else if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) errors.quantity = "Enter a whole number.";

  const area = draft.area.trim();
  if (!area) errors.area = "Enter a city or postal code.";
  else if (!isPlausibleArea(area)) errors.area = "Enter a city or postal code.";

  const fullName = draft.fullName.trim().replace(/\s+/g, " ");
  if (fullName && !isPersonName(fullName)) errors.fullName = "Use letters only.";

  if (!draft.phone.trim()) errors.phone = "Enter your mobile number.";
  else if (draft.phone.replace(/\D/g, "").length < 8 || draft.phone.replace(/\D/g, "").length > 15) {
    errors.phone = "Enter a mobile number with its country code.";
  }

  return errors;
}

export const hasDraftErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;
