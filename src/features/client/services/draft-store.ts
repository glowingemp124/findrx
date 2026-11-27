import { createPersistentStore } from "@/lib/persistent-store";
import type { RequestDraft } from "@/features/requests/types";

export const emptyDraft: RequestDraft = {
  medication: "",
  dose: "",
  form: "",
  quantity: "",
  genericPreference: "yes",
  manufacturer: "",
  needsCompounding: false,
  area: "",
  radiusMiles: 10,
  latitude: null,
  longitude: null,
  fulfilment: "pickup",
  fullName: "",
  phone: "",
};

const store = createPersistentStore<RequestDraft>("findrx-draft", emptyDraft, {
  // Holds a name and phone number, so it lives only as long as the tab.
  storage: sessionStorage,
});

/** Choices that have a default, so "empty" can't tell us the patient answered. */
export type IntakeFlags = {
  generic: boolean;
  compounding: boolean;
  radius: boolean;
  fulfilment: boolean;
  name: boolean;
};

const emptyFlags: IntakeFlags = { generic: false, compounding: false, radius: false, fulfilment: false, name: false };

const flagStore = createPersistentStore<IntakeFlags>("findrx-intake-flags", emptyFlags, { storage: sessionStorage });

export const intakeFlags = {
  use: () => ({ ...emptyFlags, ...flagStore.use() }),
  get: () => ({ ...emptyFlags, ...flagStore.get() }),
  mark: (key: keyof IntakeFlags) => flagStore.update((current) => ({ ...emptyFlags, ...current, [key]: true })),
  reset: () => flagStore.set(emptyFlags),
};

/**
 * The in-progress request. The form and the AI chat both read and write it,
 * which is what keeps them showing the same request.
 */
/** Fills fields missing from a draft saved by an older version of the form. */
const withDefaults = (draft: RequestDraft): RequestDraft => ({ ...emptyDraft, ...draft });

export const draftStore = {
  use: () => withDefaults(store.use()),
  get: () => withDefaults(store.get()),
  patch: (changes: Partial<RequestDraft>) => store.update((draft) => ({ ...draft, ...changes })),
  replace: (draft: RequestDraft) => store.set(draft),
  reset: () => {
    store.set(emptyDraft);
    intakeFlags.reset();
  },
};
