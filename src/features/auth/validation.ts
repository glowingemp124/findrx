import { isUsMobile } from "@/features/client/lib/validate-draft";
import type { PharmacyProfile } from "@/features/auth/types";

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value: string) => EMAIL.test(value.trim());
export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

function emailError(email: string) {
  if (!email.trim()) return "Enter your work email.";
  if (!isEmail(email)) return "Enter a valid email address.";
  return undefined;
}

/** At least 8 characters with a letter and a number. */
export function passwordError(password: string) {
  if (!password) return "Create a password.";
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
  return undefined;
}

function confirmError(password: string, confirm: string) {
  if (!confirm) return "Confirm your password.";
  if (confirm !== password) return "Passwords don't match.";
  return undefined;
}

const compact = <T extends string>(errors: Record<T, string | undefined>) =>
  Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as FieldErrors<T>;

export function validateSignIn(values: { email: string; password: string }) {
  return compact({
    email: emailError(values.email),
    password: values.password ? undefined : "Enter your password.",
  });
}

export function validatePharmacy(values: PharmacyProfile) {
  return compact({
    name: values.name.trim().length < 2 ? "Enter the pharmacy's name." : undefined,
    npi: /^\d{10}$/.test(values.npi) ? undefined : "Enter the pharmacy's 10-digit NPI.",
    phone: !values.phone.trim() ? "Enter the pharmacy's phone." : !isUsMobile(values.phone) ? "Enter a 10-digit US number." : undefined,
    street: values.street.trim().length < 3 ? "Enter the street address." : undefined,
    city: values.city.trim().length < 2 ? "Enter the city." : undefined,
    state: values.state ? undefined : "Choose a state.",
    zip: /^\d{5}$/.test(values.zip.trim()) ? undefined : "Enter a 5-digit ZIP.",
  });
}

export function validateAccount(values: { contactName: string; email: string; password: string; confirm: string; agreed: boolean }) {
  return compact({
    contactName: values.contactName.trim().length < 2 ? "Enter your name." : undefined,
    email: emailError(values.email),
    password: passwordError(values.password),
    confirm: confirmError(values.password, values.confirm),
    agreed: values.agreed ? undefined : "Agree to the terms to continue.",
  });
}

export function validateEmail(email: string) {
  return compact({ email: emailError(email) });
}

export function validateNewPassword(values: { password: string; confirm: string }) {
  return compact({ password: passwordError(values.password), confirm: confirmError(values.password, values.confirm) });
}

export function validatePasswordChange(values: { current: string; next: string; confirm: string }) {
  return compact({
    current: values.current ? undefined : "Enter your current password.",
    next:
      passwordError(values.next) ?? (values.current && values.next === values.current ? "Choose a different password." : undefined),
    confirm: confirmError(values.next, values.confirm),
  });
}

export function validateOtp(code: string) {
  return /^\d{6}$/.test(code) ? "" : "Enter all 6 digits.";
}
