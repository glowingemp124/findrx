import { createStripePaymentId } from "@/features/requests/services/payment-gateway";
import type { BlindRequest, DistanceBand, Fulfilment, PaymentMethodSummary } from "@/features/requests/types";
import { createPersistentStore } from "@/lib/persistent-store";

export const REFUND_REASONS = [
  { value: "pharmacy_out_of_stock", label: "Pharmacy did not have it" },
  { value: "pharmacy_unreachable", label: "Pharmacy unreachable" },
  { value: "duplicate", label: "Duplicate charge" },
  { value: "other", label: "Other" },
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number]["value"];

/**
 * One FindRx fee payment. Anonymized and kept permanently, unlike the request it came from:
 * the patient's name and phone are never copied here, only looked up while the request still exists.
 */
export type Transaction = {
  id: string;
  stripePaymentId: string;
  requestId: string;
  reference: string;
  paidAt: number;
  amountCents: number;
  method: PaymentMethodSummary;
  receiptEmail: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  medication: string;
  fulfilment: Fulfilment;
  needsCompounding: boolean;
  radiusMiles: number;
  distanceBand: DistanceBand;
  /** Posted → claimed, and claimed → paid. */
  timeToClaimMs: number;
  timeToPayMs: number;
  status: "paid" | "refunded";
  refund: { reason: RefundReason; note: string; at: number; by: string } | null;
};

const store = createPersistentStore<Transaction[]>("findrx-transactions", []);

const summary = ({ draft }: BlindRequest) =>
  [draft.medication.trim(), draft.dose.trim()].filter(Boolean).join(" ");

export const transactionStore = {
  use: store.use,
  all: store.get,

  /** Called once, when a request is paid. */
  record(request: BlindRequest, payment: NonNullable<BlindRequest["payment"]>, stripePaymentId: string) {
    const claim = request.claim!;
    const transaction: Transaction = {
      id: payment.transactionId,
      stripePaymentId,
      requestId: request.id,
      reference: request.reference,
      paidAt: payment.paidAt,
      amountCents: payment.amountCents,
      method: payment.method,
      receiptEmail: payment.receiptEmail,
      pharmacyId: claim.pharmacyId,
      pharmacyName: claim.pharmacy.name,
      pharmacyAddress: claim.pharmacy.address,
      medication: summary(request),
      fulfilment: request.draft.fulfilment,
      needsCompounding: request.draft.needsCompounding,
      radiusMiles: request.draft.radiusMiles,
      distanceBand: claim.distanceBand,
      timeToClaimMs: claim.claimedAt - (request.postedAt ?? claim.claimedAt),
      timeToPayMs: payment.paidAt - claim.claimedAt,
      status: "paid",
      refund: null,
    };
    store.update((transactions) => [transaction, ...transactions]);
  },

  refund(id: string, reason: RefundReason, note: string, by: string) {
    store.update((transactions) =>
      transactions.map((transaction) =>
        transaction.id === id && transaction.status === "paid"
          ? { ...transaction, status: "refunded", refund: { reason, note: note.trim(), at: Date.now(), by } }
          : transaction,
      ),
    );
  },

  /** Mock only: a few weeks of past payments so the admin tables and charts have history. */
  seedHistory(now: number) {
    if (store.get().some((transaction) => transaction.requestId.startsWith("archived-"))) return;
    const pharmacies = [
      ["pharmacy-riverbend", "Riverbend Pharmacy", "1420 Washington Ave, Houston, TX 77007"],
      ["pharmacy-northside", "Northside Family Pharmacy", "4500 N Lamar Blvd, Austin, TX 78751"],
      ["pharmacy-eastgate", "Eastgate Pharmacy", "910 Gessner Rd, Houston, TX 77024"],
      ["pharmacy-bellaire", "Bellaire Compounding", "5115 Bellaire Blvd, Bellaire, TX 77401"],
    ] as const;
    const medications = [
      "Levothyroxine 88 mcg", "Amoxicillin 400 mg/5 mL", "Semaglutide 0.5 mg pen", "Albuterol HFA inhaler",
      "Estradiol 1 mg", "Metformin 500 mg ER", "Adderall 20 mg", "Atorvastatin 20 mg", "Insulin glargine pen",
      "Lisinopril 10 mg", "Hydrocortisone 2.5% cream", "Ozempic 1 mg pen",
    ];
    const methods: PaymentMethodSummary[] = [
      { kind: "apple_pay" },
      { kind: "card", brand: "Visa", last4: "4242" },
      { kind: "google_pay" },
      { kind: "card", brand: "Mastercard", last4: "4444" },
      { kind: "card", brand: "Amex", last4: "0005" },
    ];
    // Deterministic pseudo-random so the seed looks the same on every machine.
    let state = 20261126;
    const random = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const seeded = Array.from({ length: 64 }, (_, index): Transaction => {
      const [pharmacyId, pharmacyName, pharmacyAddress] = pick(pharmacies);
      const paidAt = now - Math.floor((index + 1) * 9.5 * 60 * 60_000 * (0.6 + random() * 0.8));
      const refunded = random() < 0.06;
      const band = pick([{ minMiles: 0, maxMiles: 1 }, { minMiles: 1, maxMiles: 3 }, { minMiles: 3, maxMiles: 5 }, { minMiles: 5, maxMiles: 10 }]);
      return {
        id: `TXN-${47000 + 64 - index}${index % 10}`.slice(0, 9),
        stripePaymentId: createStripePaymentId(),
        requestId: `archived-${index}`,
        reference: `FRX-${3000 + Math.floor(random() * 6000)}`,
        paidAt,
        amountCents: 499,
        method: pick(methods),
        receiptEmail: random() < 0.5 ? "" : `patient${index}@example.com`,
        pharmacyId,
        pharmacyName,
        pharmacyAddress,
        medication: pick(medications),
        fulfilment: random() < 0.3 ? "delivery" : "pickup",
        needsCompounding: pharmacyName.includes("Compounding") && random() < 0.6,
        radiusMiles: pick([5, 10, 10, 25]),
        distanceBand: band,
        timeToClaimMs: Math.floor((2 + random() * 26) * 60_000),
        timeToPayMs: Math.floor((1 + random() * 40) * 60_000),
        status: refunded ? "refunded" : "paid",
        refund: refunded ? { reason: "pharmacy_out_of_stock", note: "", at: paidAt + 3 * 60 * 60_000, by: "Marcus Webb" } : null,
      };
    });
    store.update((transactions) => [...transactions, ...seeded]);
  },
};
