import { usDigits } from "@/features/requests/lib/formatters";
import type { RequestDraft } from "@/features/requests/types";

export type DraftField = keyof RequestDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

const ZIP = /^\d{5}(-\d{4})?$/;
const CITY = /^[a-z][a-z .'-]*(,\s*[a-z]{2,})?$/i;

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
  if (!area) errors.area = "Enter a ZIP code or city.";
  else if (!ZIP.test(area) && !(area.length >= 2 && CITY.test(area))) errors.area = "Enter a 5-digit ZIP or a city name.";

  const fullName = draft.fullName.trim().replace(/\s+/g, " ");
  if (!fullName) errors.fullName = "Enter your full name.";
  else if (!/^[a-z][a-z' .-]*$/i.test(fullName)) errors.fullName = "Use letters only.";
  else if (!fullName.includes(" ")) errors.fullName = "Enter your first and last name.";

  if (!draft.phone.trim()) errors.phone = "Enter your mobile number.";
  else if (!isUsMobile(draft.phone)) errors.phone = "Enter a 10-digit US mobile number.";

  return errors;
}

export const hasDraftErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;
