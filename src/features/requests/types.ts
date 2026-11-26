export const MEDICATION_FORMS = ["tablet", "capsule", "injection", "liquid", "inhaler", "cream", "other"] as const;
export type MedicationForm = (typeof MEDICATION_FORMS)[number];

export const GENERIC_PREFERENCES = ["yes", "no", "ask"] as const;
export type GenericPreference = (typeof GENERIC_PREFERENCES)[number];

/** Miles. The admin chooses which distances are offered (see platform settings). */
export type SearchRadius = number;

export type Fulfilment = "pickup" | "delivery";

/** Everything the client fills in, by form or by chat. Values stay as typed until validated. */
export type RequestDraft = {
  medication: string;
  dose: string;
  form: MedicationForm | "";
  quantity: string;
  genericPreference: GenericPreference;
  manufacturer: string;
  needsCompounding: boolean;
  area: string;
  radiusMiles: SearchRadius;
  fulfilment: Fulfilment;
  fullName: string;
  phone: string;
};

export type DistanceBand = { minMiles: number; maxMiles: number };

export type PharmacyClaim = {
  claimedAt: number;
  pharmacyId: string;
  pharmacy: {
    name: string;
    address: string;
    phone: string;
  };
  /** Rough distance shown before payment, never an exact address. */
  distanceBand: DistanceBand;
};

export type PaymentMethodSummary = { kind: "card"; brand: string; last4: string } | { kind: "apple_pay" | "google_pay" };

export type Payment = {
  transactionId: string;
  paidAt: number;
  receiptEmail: string;
  amountCents: number;
  method: PaymentMethodSummary;
};

export type OtpChallenge = {
  code: string;
  expiresAt: number;
};

export type BlindRequest = {
  /** Unguessable id used in URLs. The client has no account, so this link is their access. */
  id: string;
  /** Short reference shown to people, e.g. FRX-4412. */
  reference: string;
  draft: RequestDraft;
  createdAt: number;
  /** FindRx fee in cents, fixed when the request is created so later fee changes don't affect it. */
  feeCents: number;
  /** Set while the phone is unverified, cleared once the code is accepted. */
  verification: OtpChallenge | null;
  postedAt: number | null;
  notifiedPharmacies: number;
  claim: PharmacyClaim | null;
  payment: Payment | null;
  closedAt: number | null;
  noMatchNotified: boolean;
  /** Claims that lapsed because the client didn't pay in time. Kept so pharmacies can see their history. */
  releasedClaims: PharmacyClaim[];
  /** Mock only: posted by the simulated patient network rather than a real client. */
  simulated?: boolean;
};

/** Where a request is in its life, derived from timestamps. See `resolvePhase`. */
export type RequestPhase =
  | "pending_verification"
  | "live"
  | "no_match"
  | "pharmacy_found"
  | "checkout_expired"
  | "connected"
  | "closed";

export type SmsMessage = {
  id: string;
  sentAt: number;
  body: string;
  link?: { label: string; to: string };
  /** One-time code in the message, offered as a copy button. */
  code?: string;
  read: boolean;
};
