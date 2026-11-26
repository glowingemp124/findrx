import { isEmail } from "@/features/auth/validation";

export type CardInput = { email: string; number: string; expiry: string; cvc: string };
export type CardErrors = Partial<Record<keyof CardInput, string>>;

/** "4242424242424242" -> "4242 4242 4242 4242" */
export const formatCardNumber = (value: string) =>
  value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

/** "1228" -> "12 / 28" */
export function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

function luhn(digits: string) {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function expiryError(value: string, now: Date) {
  const [month, year] = value.split("/").map((part) => Number(part.trim()));
  if (!month || year === undefined || Number.isNaN(year) || month > 12) return "Enter MM / YY.";
  const endOfMonth = new Date(2000 + year, month, 1);
  return endOfMonth <= now ? "This card has expired." : undefined;
}

export const validateEmail = (email: string) =>
  !email.trim() ? "Enter an email for your receipt." : !isEmail(email) ? "Enter a valid email address." : undefined;

export function validateCard(input: CardInput, now = new Date()): CardErrors {
  const errors: CardErrors = {};
  const digits = input.number.replace(/\D/g, "");
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  if (digits.length < 13 || !luhn(digits)) errors.number = "Enter a valid card number.";
  const expiry = expiryError(input.expiry, now);
  if (expiry) errors.expiry = expiry;
  if (!/^\d{3,4}$/.test(input.cvc)) errors.cvc = "Enter the 3 or 4 digit code.";
  return errors;
}
