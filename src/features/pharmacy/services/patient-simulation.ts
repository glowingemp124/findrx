import { resolvePhase } from "@/features/requests/lib/request-phase";
import { requestService } from "@/features/requests/services/request-service";
import type { RequestDraft } from "@/features/requests/types";
import { pharmacyConfig } from "@/features/pharmacy/config";

/**
 * Mock only. Stands in for patients so the pharmacy feed isn't empty: posts realistic requests
 * at intervals and has some of them pay after a claim. Real client requests flow alongside these.
 * Delete this file (and `requestService.simulation`) once there is real traffic.
 */

type Template = Pick<RequestDraft, "medication" | "dose" | "form" | "quantity"> & Partial<RequestDraft>;

const TEMPLATES: Template[] = [
  { medication: "Albuterol", dose: "90 mcg HFA", form: "inhaler", quantity: "2" },
  { medication: "Semaglutide", dose: "1 mg pen", form: "injection", quantity: "4", genericPreference: "no" },
  { medication: "Amoxicillin", dose: "400 mg/5 mL", form: "liquid", quantity: "100" },
  { medication: "Hydrocortisone 2.5% in Aquaphor", dose: "60 g", form: "cream", quantity: "1", needsCompounding: true },
  { medication: "Metformin", dose: "500 mg ER", form: "tablet", quantity: "60", fulfilment: "delivery" },
  { medication: "Atorvastatin", dose: "20 mg", form: "tablet", quantity: "90" },
  { medication: "Estradiol", dose: "1 mg", form: "tablet", quantity: "30" },
  { medication: "Insulin glargine", dose: "100 units/mL pen", form: "injection", quantity: "5" },
  { medication: "Adderall", dose: "20 mg", form: "tablet", quantity: "30", genericPreference: "ask" },
  { medication: "Lisinopril", dose: "10 mg", form: "tablet", quantity: "90", fulfilment: "delivery" },
];

const PATIENTS = ["Jordan Ellis", "Maria Gomez", "Sam Patel", "Taylor Brooks", "Chris Nguyen", "Alex Moore", "Dana Reyes"];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function draftFrom(template: Template): RequestDraft {
  return {
    genericPreference: "yes",
    manufacturer: "",
    needsCompounding: false,
    area: "77007",
    radiusMiles: pick([5, 10, 10, 25] as const),
    latitude: null,
    longitude: null,
    fulfilment: "pickup",
    fullName: pick(PATIENTS),
    phone: `713555${String(Math.floor(100 + Math.random() * 900)).padStart(4, "0")}`,
    ...template,
  };
}

const willPay = (id: string) => (parseInt(id.slice(0, 6), 16) % 100) / 100 < pharmacyConfig.simulation.payRate;

function postRandom(postedAt: number) {
  const live = new Set(
    requestService
      .all()
      .filter((request) => request.simulated && resolvePhase(request, Date.now()) === "live")
      .map((request) => request.draft.medication),
  );
  const fresh = TEMPLATES.filter((template) => !live.has(template.medication));
  requestService.simulation.post(draftFrom(pick(fresh.length ? fresh : TEMPLATES)), postedAt);
}

/** Seeds the feed and keeps posting. Returns a stop function. */
export function startPatientSimulation(): () => void {
  const { initialRequests, minGapMs, maxGapMs } = pharmacyConfig.simulation;
  const now = Date.now();
  const liveCount = requestService.all().filter((request) => request.simulated && resolvePhase(request, now) === "live").length;
  [0, 4, 11, 19].slice(0, Math.max(0, initialRequests - liveCount)).forEach((minutesAgo) => postRandom(now - minutesAgo * 60_000));

  let timer = 0;
  const schedule = () => {
    timer = window.setTimeout(() => {
      postRandom(Date.now());
      schedule();
    }, minGapMs + Math.random() * (maxGapMs - minGapMs));
  };
  schedule();
  return () => window.clearTimeout(timer);
}

/** Simulated patients who were claimed pay after a short delay. */
export function advancePatientSimulation(now: number) {
  for (const request of requestService.all()) {
    if (!request.simulated || !request.claim || request.payment) continue;
    if (resolvePhase(request, now) !== "pharmacy_found") continue;
    if (now >= request.claim.claimedAt + pharmacyConfig.simulation.paymentDelayMs && willPay(request.id)) {
      requestService.simulation.pay(request.id);
    }
  }
}
