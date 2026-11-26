import type { PaymentMethodSummary } from "@/features/requests/types";

export type PaymentMethod = { kind: "wallet"; provider: "apple" | "google" } | { kind: "card"; number: string };

export type ChargeResult =
  | { ok: true; transactionId: string; stripePaymentId: string; method: PaymentMethodSummary }
  | { ok: false; reason: "declined" };

/** Stripe's well-known test number that is always declined. */
const DECLINED_TEST_CARD = "4000000000000002";

const randomId = (length: number) =>
  Array.from({ length }, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join("");

export const createTransactionId = () => `TXN-${Math.floor(10000 + Math.random() * 90000)}`;
export const createStripePaymentId = () => `pi_${randomId(24)}`;

function cardBrand(digits: string) {
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (digits.startsWith("6")) return "Discover";
  return "Card";
}

function summarize(method: PaymentMethod): PaymentMethodSummary {
  if (method.kind === "wallet") return { kind: method.provider === "apple" ? "apple_pay" : "google_pay" };
  const digits = method.number.replace(/\D/g, "");
  return { kind: "card", brand: cardBrand(digits), last4: digits.slice(-4) };
}

/** Mock payment gateway. Replace with Stripe; keep this return shape. */
export async function charge(method: PaymentMethod): Promise<ChargeResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  if (method.kind === "card" && method.number.replace(/\D/g, "") === DECLINED_TEST_CARD) {
    return { ok: false, reason: "declined" };
  }
  return { ok: true, transactionId: createTransactionId(), stripePaymentId: createStripePaymentId(), method: summarize(method) };
}

export function formatPaymentMethod(method: PaymentMethodSummary) {
  switch (method.kind) {
    case "apple_pay":
      return "Apple Pay";
    case "google_pay":
      return "Google Pay";
    case "card":
      return `${method.brand} •••• ${method.last4}`;
  }
}
