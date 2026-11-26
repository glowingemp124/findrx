import { findMedication, looksLikeNdc, MEDICATION_CATALOG } from "@/features/client/lib/medication-catalog";
import { formLabel } from "@/features/requests/lib/formatters";
import { MEDICATION_FORMS, type MedicationForm, type RequestDraft } from "@/features/requests/types";

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

/** Required fields, asked in order. Dose is optional, so it is picked up from any message but never asked for on its own. */
type Slot = "medication" | "form" | "quantity";

const nextSlot = (draft: RequestDraft): Slot | null => {
  if (!draft.medication.trim()) return "medication";
  if (!draft.form) return "form";
  if (!draft.quantity.trim()) return "quantity";
  return null;
};

function question(draft: RequestDraft): Pick<AssistantReply, "messages" | "suggestions"> {
  const entry = findMedication(draft.medication);
  switch (nextSlot(draft)) {
    case "medication":
      return {
        messages: ["What medication are you looking for? The name, the NDC, or whatever is printed on the label or box works."],
        suggestions: [NOT_SURE, "Metformin", "Ozempic", "Amoxicillin"],
      };
    case "form":
      return {
        messages: [
          draft.dose.trim()
            ? "What form does it come in?"
            : "What form does it come in? If you know the strength (like 500 mg), add it too. That part is optional.",
        ],
        suggestions: (entry?.forms.length ? entry.forms : MEDICATION_FORMS).map(formLabel),
      };
    case "quantity":
      return { messages: ["How many do you need? Use the number on your prescription."], suggestions: ["30", "60", "90"] };
    case null:
      return {
        messages: ["That's the medication sorted. Add your area and contact details in the form, then post your Blind Request."],
        suggestions: [],
      };
  }
}

/** Pulls every field it can recognise out of one message, whatever the assistant last asked. */
function understand(input: string, draft: RequestDraft): Partial<RequestDraft> {
  const patch: Partial<RequestDraft> = {};
  const slot = nextSlot(draft);
  const entry = findMedication(input);

  if (entry) patch.medication = entry.name;
  else if (slot === "medication") patch.medication = input.trim();

  const dose = input.match(DOSE);
  if (dose) patch.dose = `${dose[1]} ${dose[2].toLowerCase()}`;

  const form = MEDICATION_FORMS.find((candidate) => FORM_WORDS[candidate].test(input));
  if (form) patch.form = form;
  else if (entry?.forms.length === 1 && !draft.form) patch.form = entry.forms[0];

  if (slot === "quantity" || (slot && slot !== "medication" && /\b(qty|quantity|x)\b/i.test(input))) {
    const quantity = input.replace(DOSE, "").match(QUANTITY);
    if (quantity) patch.quantity = quantity[1];
  }

  return patch;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Scripted stand-in for the AI. It fills one field at a time and accepts free text throughout. */
export const mockMedicationAssistant: MedicationAssistant = {
  greet(draft) {
    const { messages, suggestions } = question(draft);
    return {
      messages: ["Hi, I'm FindRx AI. I'll help you post a Blind Request in about a minute, no account needed.", ...messages],
      patch: {},
      suggestions,
    };
  },

  async respond(input, draft) {
    await wait(600);

    if (input === NOT_SURE) {
      return {
        messages: [
          "No problem. Type whatever is printed on the label or box, even part of it, or the NDC (a code like 0002-1433-80).",
        ],
        patch: {},
        suggestions: MEDICATION_CATALOG.slice(0, 4).map((entry) => entry.name),
      };
    }

    const patch = understand(input, draft);
    const next = { ...draft, ...patch };
    const notes: string[] = [];

    if (patch.medication) {
      const entry = findMedication(patch.medication);
      notes.push(
        entry
          ? `Got it: ${entry.name}.`
          : looksLikeNdc(input)
            ? `I'll pass the NDC ${input.trim()} to pharmacies as written.`
            : `I'll use "${patch.medication}" as written. Pharmacies will check it.`,
      );
    } else if (Object.keys(patch).length === 0) {
      notes.push("Sorry, I didn't catch that.");
    }

    const { messages, suggestions } = question(next);
    return { messages: [...notes, ...messages], patch, suggestions };
  },
};
