import { intakeFlags, type IntakeFlags } from "@/features/client/services/draft-store";
import { findMedication, looksLikeNdc, MEDICATION_CATALOG } from "@/features/client/lib/medication-catalog";
import { formLabel, formatPhone, genericLabel } from "@/features/requests/lib/formatters";
import { MEDICATION_FORMS, type GenericPreference, type MedicationForm, type RequestDraft } from "@/features/requests/types";

export type AssistantReply = {
  messages: string[];
  /** Fields the assistant understood from the client's message. Applied to the shared draft. */
  patch: Partial<RequestDraft>;
  suggestions: string[];
};

/** The contract a real model-backed assistant must meet. It identifies products only, never gives medical advice. */
export type MedicationAssistant = {
  greet(draft: RequestDraft): AssistantReply;
  respond(input: string, draft: RequestDraft): Promise<AssistantReply>;
};

export const NOT_SURE = "I'm not sure of the exact name";

export const DELIVERY_DISCLAIMER =
  "Delivery fees may apply and are not charged by FindRx. A pharmacy may deliver only in some areas, or not at all, and it sets its own fee.";

const DOSE = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?|%)\b/i;
const QUANTITY = /\b(\d{1,4})\b(?!\s*(?:mg|mcg|g|ml|units?|%))/i;

const FORM_WORDS: Record<MedicationForm, RegExp> = {
  tablet: /\b(tablets?|tabs?|pills?)\b/i,
  capsule: /\b(capsules?|caps?)\b/i,
  injection: /\b(injections?|injectables?|pens?|shots?|vials?)\b/i,
  liquid: /\b(liquid|syrup|suspension|solution)\b/i,
  inhaler: /\b(inhalers?|puffers?)\b/i,
  cream: /\b(creams?|ointments?|gels?)\b/i,
  other: /\bother\b/i,
};

/** One medication, collected entirely in the chat. The side form is not part of this flow. */
export type IntakeStep =
  | "medication"
  | "form"
  | "quantity"
  | "generic"
  | "compounding"
  | "fulfilment"
  | "place"
  | "done";

export function intakeStep(draft: RequestDraft, flags: IntakeFlags = intakeFlags.get()): IntakeStep {
  if (!draft.medication.trim()) return "medication";
  if (!draft.form) return "form";
  if (!draft.quantity.trim()) return "quantity";
  if (!flags.generic) return "generic";
  if (!flags.compounding) return "compounding";
  if (!flags.fulfilment) return "fulfilment";
  if (!draft.area.trim() || !flags.radius || !flags.name || !draft.phone.trim() || draft.latitude == null) return "place";
  return "done";
}

function question(draft: RequestDraft): Pick<AssistantReply, "messages" | "suggestions"> {
  const entry = findMedication(draft.medication);
  switch (intakeStep(draft)) {
    case "medication":
      return {
        messages: ["What medication are you looking for? One medication per request. The name, the NDC, or whatever is printed on the label works."],
        suggestions: [NOT_SURE, "Metformin", "Ozempic", "Amoxicillin"],
      };
    case "form":
      return {
        messages: ["What form does it come in?"],
        suggestions: (entry?.forms.length ? entry.forms : MEDICATION_FORMS).map(formLabel),
      };
    case "quantity":
      return { messages: ["How many do you need? Use the number on your prescription."], suggestions: ["30", "60", "90"] };
    case "generic":
      return { messages: ["Is a generic OK?"], suggestions: ["Yes", "No", "Check with pharmacist"] };
    case "compounding":
      return { messages: ["Does it need to be compounded?"], suggestions: ["No", "Yes"] };
    case "fulfilment":
      return {
        messages: ["How do you want to get it?", DELIVERY_DISCLAIMER],
        suggestions: ["Pickup", "Delivery"],
      };
    case "place":
      return {
        messages: [
          "Set the area on the map, then your name and mobile number.",
        ],
        suggestions: [],
      };
    case "done":
      return {
        messages: [
          `Ready to post ${draft.medication.trim()}${draft.dose.trim() ? `, ${draft.dose.trim()}` : ""} · ${draft.quantity.trim()} ${draft.form ? formLabel(draft.form).toLowerCase() : ""} · ${genericLabel(draft.genericPreference).toLowerCase()} on generic · ${draft.radiusMiles <= 0 ? `any distance from ${draft.area.trim()}` : `within ${draft.radiusMiles} miles of ${draft.area.trim()}`}. ${draft.fulfilment === "delivery" ? "Delivery requested." : "Pickup."} We'll text ${formatPhone(draft.phone)}.`,
        ],
        suggestions: [],
      };
  }
}

function genericFrom(input: string): GenericPreference | null {
  if (/^yes\b/i.test(input)) return "yes";
  if (/^no\b/i.test(input)) return "no";
  if (/\b(check|ask|pharmacist|not sure)\b/i.test(input)) return "ask";
  return null;
}

/** Pulls the answer for the current question. Later questions don't rewrite earlier ones. */
function understand(input: string, draft: RequestDraft): { patch: Partial<RequestDraft>; mark: Array<keyof IntakeFlags> } {
  const step = intakeStep(draft);
  const patch: Partial<RequestDraft> = {};
  const mark: Array<keyof IntakeFlags> = [];

  if (step === "medication" || step === "form" || step === "quantity") {
    const entry = findMedication(input);
    if (entry) patch.medication = entry.name;
    else if (step === "medication") patch.medication = input.trim();

    const dose = input.match(DOSE);
    if (dose) patch.dose = `${dose[1]} ${dose[2].toLowerCase()}`;

    const form = MEDICATION_FORMS.find((candidate) => FORM_WORDS[candidate].test(input));
    if (form) patch.form = form;
    else if (entry?.forms.length === 1 && !draft.form) patch.form = entry.forms[0];

    if (step === "quantity") {
      const quantity = input.replace(DOSE, "").match(QUANTITY);
      if (quantity) patch.quantity = quantity[1];
    }
    return { patch, mark };
  }

  if (step === "generic") {
    const generic = genericFrom(input);
    if (generic) {
      patch.genericPreference = generic;
      mark.push("generic");
    }
  } else if (step === "compounding") {
    if (/^no\b/i.test(input)) {
      patch.needsCompounding = false;
      mark.push("compounding");
    } else if (/^yes\b/i.test(input)) {
      patch.needsCompounding = true;
      mark.push("compounding");
    }
  } else if (step === "fulfilment") {
    if (/\bdeliver/i.test(input)) {
      patch.fulfilment = "delivery";
      mark.push("fulfilment");
    } else if (/\bpick/i.test(input)) {
      patch.fulfilment = "pickup";
      mark.push("fulfilment");
    }
  }

  return { patch, mark };
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Scripted stand-in for the AI. It asks for every field, then the patient posts from the chat. */
export const mockMedicationAssistant: MedicationAssistant = {
  greet(draft) {
    const { messages, suggestions } = question(draft);
    return {
      messages: ["Hi, I'm FindRx. One medication at a time.", ...messages],
      patch: {},
      suggestions,
    };
  },

  async respond(input, draft) {
    await wait(450);
    const step = intakeStep(draft);

    if (step === "medication" && input === NOT_SURE) {
      return {
        messages: ["No problem. Type whatever is printed on the label or box, even part of it, or the NDC (a code like 0002-1433-80)."],
        patch: {},
        suggestions: MEDICATION_CATALOG.slice(0, 4).map((entry) => entry.name),
      };
    }

    if (step === "done") {
      return { messages: ["Use Post request below. To start over, refresh this page after you post."], patch: {}, suggestions: [] };
    }

    const { patch, mark } = understand(input, draft);
    for (const flag of mark) intakeFlags.mark(flag);
    const next = { ...draft, ...patch };
    const notes: string[] = [];

    if (patch.medication && step === "medication") {
      const entry = findMedication(patch.medication);
      notes.push(
        entry
          ? `Got it: ${entry.name}.`
          : looksLikeNdc(input)
            ? `I'll pass the NDC ${input.trim()} to pharmacies as written.`
            : `I'll use "${patch.medication}" as written. Pharmacies will check it.`,
      );
    } else if (Object.keys(patch).length === 0 && mark.length === 0) {
      notes.push(step === "place" ? "Use the map to set your area, name, and mobile number." : "Sorry, I didn't catch that. Use one of the choices, or type it the same way.");
    }

    const { messages, suggestions } = question(next);
    return { messages: [...notes, ...messages], patch, suggestions };
  },
};
