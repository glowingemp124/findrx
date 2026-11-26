import type { OpeningHours } from "@/lib/opening-hours";
import type { UsStateCode } from "@/lib/us-states";

export type PharmacyProfile = {
  name: string;
  /** National Provider Identifier, 10 digits. Checked against the NPI registry by FindRx staff. */
  npi: string;
  phone: string;
  street: string;
  city: string;
  state: UsStateCode | "";
  zip: string;
  /** Compounding requests are only shown to pharmacies that compound. */
  canCompound: boolean;
  hours: OpeningHours;
};

/** FindRx reviews every new pharmacy before it can see requests. */
export type PharmacyStatus = "pending" | "info_requested" | "active" | "rejected" | "suspended";

export type PharmacyAccount = {
  id: string;
  email: string;
  /** Mock only. A real backend never sends or stores plain passwords on the client. */
  password: string;
  contactName: string;
  /** Optional credential shown after the name, e.g. PharmD. */
  contactTitle: string;
  pharmacy: PharmacyProfile;
  /** When off, the pharmacy can't claim and the feed shows as paused. */
  acceptingRequests: boolean;
  createdAt: number;
  /** Profile photo of the signed-in pharmacist, as a small data URL. */
  avatar?: string | null;
  status: PharmacyStatus;
  /** Message from FindRx staff with the latest decision (reason, or what's needed). */
  statusNote: string | null;
};

/** What the UI may hold about the signed-in account. */
export type SessionAccount = Omit<PharmacyAccount, "password">;

export type SignUpInput = Pick<PharmacyAccount, "email" | "password" | "contactName" | "contactTitle" | "pharmacy">;

export type StatusChange = { status: PharmacyStatus; note: string | null };

export type Challenge = {
  purpose: "signup" | "reset";
  email: string;
  /** Null when no account exists for a reset email, so nothing was sent. */
  code: string | null;
  expiresAt: number;
  verified: boolean;
  signUp?: SignUpInput;
};

export type AuthResult = { ok: true } | { ok: false; error: string };
