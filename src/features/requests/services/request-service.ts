import { paths } from "@/app/paths";
import { pharmaciesNear } from "@/features/client/lib/pharmacy-coverage";
import { isPurgeable, resolvePhase } from "@/features/requests/lib/request-phase";
import { platformSettings, renderTemplate, type SmsTemplateId } from "@/features/platform/platform-settings";
import { formatUsd } from "@/features/requests/lib/formatters";
import {
  charge,
  createStripePaymentId,
  createTransactionId,
  type PaymentMethod,
} from "@/features/requests/services/payment-gateway";
import { smsStore } from "@/features/requests/services/sms-store";
import { transactionStore } from "@/features/requests/services/transaction-store";
import type { BlindRequest, PaymentMethodSummary, PharmacyClaim, RequestDraft, SearchRadius } from "@/features/requests/types";
import { createPersistentStore } from "@/lib/persistent-store";

// v2: claims carry a pharmacy id and released claims are kept. Older mock data is dropped.
const store = createPersistentStore<BlindRequest[]>("findrx-requests-v2", []);

const createCode = () => "123456";
const createReference = () => `FRX-${Math.floor(1000 + Math.random() * 9000)}`;
const OTP_TTL_MS = 10 * 60_000;

/** Pharmacies inside the patient's circle, or a rough count when the request has no pin. */
const notifiedFor = (draft: Pick<RequestDraft, "radiusMiles" | "latitude" | "longitude" | "needsCompounding">) => {
  if (draft.latitude != null && draft.longitude != null) {
    return pharmaciesNear({ lat: draft.latitude, lng: draft.longitude }, draft.radiusMiles, draft.needsCompounding).length;
  }
  return Math.round(4 + draft.radiusMiles * 1.05);
};

/** Builds a text from the admin's template. */
const text = (id: SmsTemplateId, values: Record<string, string> = {}) => renderTemplate(platformSettings.get().smsTemplates[id], values);

/** Requests created before fees were stored on them fall back to the current fee. */
export const requestFee = (request: BlindRequest) => request.feeCents ?? platformSettings.get().feeCents;

function patchRequest(id: string, recipe: (request: BlindRequest) => BlindRequest) {
  store.update((requests) => requests.map((request) => (request.id === id ? recipe(request) : request)));
}

function newRequest(draft: RequestDraft): BlindRequest {
  return {
    id: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
    reference: createReference(),
    draft: { ...draft, phone: draft.phone.replace(/\D/g, "") },
    createdAt: Date.now(),
    feeCents: platformSettings.get().feeCents,
    verification: null,
    postedAt: null,
    notifiedPharmacies: 0,
    claim: null,
    payment: null,
    closedAt: null,
    noMatchNotified: false,
    releasedClaims: [],
  };
}

function issueCode(id: string) {
  const challenge = { code: createCode(), expiresAt: Date.now() + OTP_TTL_MS };
  patchRequest(id, (request) => ({ ...request, verification: challenge }));
  smsStore.send(`${text("verification_code", { code: challenge.code })}\nReply STOP to opt out.`, { code: challenge.code });
}

/** Texts reach real clients only; simulated patients have no phone. */
function textClient(request: BlindRequest, body: string, link?: { label: string; to: string }) {
  if (!request.simulated) smsStore.send(body, { link });
}

export type VerifyResult = { ok: true } | { ok: false; reason: "wrong_code" | "expired" | "not_found" };
export type PayResult = { ok: true } | { ok: false; reason: "declined" | "unavailable" };
export type ClaimResult = { ok: true; claimedAt: number } | { ok: false; reason: "taken" | "unavailable" };

/**
 * Request lifecycle shared by the client and pharmacy sides. Backed by localStorage today;
 * each method maps to one API call when a backend exists, so callers don't change.
 */
export const requestService = {
  use: store.use,
  all: store.get,

  find: (id: string | undefined) => (id ? store.get().find((request) => request.id === id) : undefined),

  /**
   * Saves the draft. When phone codes are required (platform setting) it waits for the code;
   * otherwise it is posted straight away.
   */
  begin(draft: RequestDraft): { request: BlindRequest; needsCode: boolean } {
    const request = newRequest(draft);
    const needsCode = platformSettings.get().requirePhoneCode;
    const saved: BlindRequest = needsCode ? request : { ...request, postedAt: Date.now(), notifiedPharmacies: notifiedFor(draft) };
    store.update((requests) => [...requests, saved]);
    if (needsCode) issueCode(request.id);
    return { request: saved, needsCode };
  },

  resendCode: issueCode,

  /** Drops a request the client backed out of before verifying. */
  discard(id: string) {
    store.update((requests) => requests.filter((request) => request.id !== id || request.postedAt !== null));
  },

  /** Accepts the SMS code and posts the request to pharmacies. */
  verify(id: string, code: string): VerifyResult {
    const request = requestService.find(id);
    if (!request?.verification) return { ok: false, reason: "not_found" };
    if (Date.now() > request.verification.expiresAt) return { ok: false, reason: "expired" };
    if (code !== request.verification.code) return { ok: false, reason: "wrong_code" };
    patchRequest(id, (current) => ({
      ...current,
      verification: null,
      postedAt: Date.now(),
      notifiedPharmacies: notifiedFor(current.draft),
    }));
    return { ok: true };
  },

  /** A pharmacy confirms stock. First claim wins; the client is texted a payment link. */
  claim(id: string, claim: Omit<PharmacyClaim, "claimedAt">): ClaimResult {
    const request = requestService.find(id);
    const now = Date.now();
    if (!request) return { ok: false, reason: "unavailable" };
    if (request.claim) return { ok: false, reason: "taken" };
    if (resolvePhase(request, now) !== "live") return { ok: false, reason: "unavailable" };
    patchRequest(id, (current) => ({ ...current, claim: { ...claim, claimedAt: now } }));
    if (requestFee(request) === 0) {
      recordPayment(id, {
        transactionId: createTransactionId(),
        stripePaymentId: "waived",
        method: { kind: "waived" },
        receiptEmail: "",
      });
      const { pharmacy } = claim;
      textClient(request, text("pharmacy_details", { pharmacy: pharmacy.name, address: pharmacy.address, phone: pharmacy.phone }), {
        label: "View pharmacy",
        to: paths.client.connected(id),
      });
    } else {
      textClient(request, text("pharmacy_found", { fee: formatUsd(requestFee(request)) }), {
        label: "Pay and connect",
        to: paths.client.pay(id),
      });
    }
    return { ok: true, claimedAt: now };
  },

  async pay(id: string, method: PaymentMethod, receiptEmail: string): Promise<PayResult> {
    const before = requestService.find(id);
    if (!before || resolvePhase(before, Date.now()) !== "pharmacy_found") return { ok: false, reason: "unavailable" };
    const result = await charge(method);
    if (!result.ok) return result;
    // The checkout window may have lapsed while the charge was processing.
    const current = requestService.find(id);
    if (!current?.claim || resolvePhase(current, Date.now()) !== "pharmacy_found") return { ok: false, reason: "unavailable" };
    recordPayment(id, { transactionId: result.transactionId, stripePaymentId: result.stripePaymentId, method: result.method, receiptEmail });
    const { pharmacy } = current.claim;
    textClient(current, text("pharmacy_details", { pharmacy: pharmacy.name, address: pharmacy.address, phone: pharmacy.phone }), {
      label: "View details",
      to: paths.client.connected(id),
    });
    return { ok: true };
  },

  /** No match after the queue window: search a wider area and start the wait again. */
  widenSearch(id: string, radiusMiles: SearchRadius) {
    patchRequest(id, (request) => ({
      ...request,
      draft: { ...request.draft, radiusMiles },
      postedAt: Date.now(),
      notifiedPharmacies: notifiedFor({ ...request.draft, radiusMiles }),
      noMatchNotified: false,
    }));
  },

  /** Closes the request at no charge. */
  close(id: string) {
    patchRequest(id, (request) => ({ ...request, closedAt: Date.now() }));
  },

  /** Puts a lapsed request back in the queue, optionally with edits. The lapsed claim is kept as released. */
  repost(id: string, edits: Partial<RequestDraft> = {}) {
    patchRequest(id, (request) => ({
      ...request,
      draft: { ...request.draft, ...edits },
      postedAt: Date.now(),
      claim: null,
      releasedClaims: request.claim ? [...request.releasedClaims, request.claim] : request.releasedClaims,
      noMatchNotified: false,
      notifiedPharmacies: notifiedFor({ ...request.draft, ...edits }),
    }));
  },

  /** Removes requests whose retention period has passed. */
  purgeExpired(now: number) {
    store.update((requests) => {
      const kept = requests.filter((request) => !isPurgeable(request, now));
      return kept.length === requests.length ? requests : kept;
    });
  },

  /** Client-side housekeeping for one request: deletes expired data and sends the no-match text once. */
  sync(id: string, now: number) {
    requestService.purgeExpired(now);
    const request = requestService.find(id);
    if (!request || resolvePhase(request, now) !== "no_match" || request.noMatchNotified) return;
    patchRequest(id, (current) => ({ ...current, noMatchNotified: true }));
    textClient(request, text("no_match"), {
      label: "Choose",
      to: paths.client.request(id),
    });
  },

  /** Mock only: hooks for the simulated patient network. Remove with it. */
  simulation: {
    post(draft: RequestDraft, postedAt: number) {
      const request: BlindRequest = {
        ...newRequest(draft),
        createdAt: postedAt,
        postedAt,
        notifiedPharmacies: notifiedFor(draft),
        simulated: true,
      };
      store.update((requests) => [...requests, request]);
      return request;
    },
    pay(id: string) {
      const method: PaymentMethodSummary = Math.random() < 0.5 ? { kind: "apple_pay" } : { kind: "card", brand: "Visa", last4: "4242" };
      recordPayment(id, { transactionId: createTransactionId(), stripePaymentId: createStripePaymentId(), method, receiptEmail: "" });
    },
  },
};

type PaymentRecord = { transactionId: string; stripePaymentId: string; method: PaymentMethodSummary; receiptEmail: string };

/** Marks the request paid and writes the permanent, anonymized transaction record. */
function recordPayment(id: string, { transactionId, stripePaymentId, method, receiptEmail }: PaymentRecord) {
  const request = requestService.find(id);
  if (!request?.claim) return;
  const payment = { transactionId, paidAt: Date.now(), receiptEmail, amountCents: requestFee(request), method };
  patchRequest(id, (current) => ({ ...current, payment }));
  transactionStore.record(request, payment, stripePaymentId);
}
