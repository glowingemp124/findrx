import { createPersistentStore } from "@/lib/persistent-store";

export type DisputeStatus = "open" | "refunded" | "denied";

/** A patient says the pharmacy claimed the medication and then didn't furnish it. */
export type Dispute = {
  id: string;
  requestId: string;
  reference: string;
  pharmacyId: string;
  pharmacyName: string;
  medication: string;
  area: string;
  openedAt: number;
  patientNote: string;
  pharmacyNote: string | null;
  pharmacyRespondedAt: number | null;
  status: DisputeStatus;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: number | null;
};

const store = createPersistentStore<Dispute[]>("findrx-disputes", []);

export const disputeStore = {
  use: store.use,
  all: store.get,
  forRequest: (requestId: string) => store.get().find((item) => item.requestId === requestId),

  open(input: Omit<Dispute, "id" | "openedAt" | "pharmacyNote" | "pharmacyRespondedAt" | "status" | "decisionNote" | "decidedBy" | "decidedAt">) {
    if (store.get().some((item) => item.requestId === input.requestId)) return;
    const dispute: Dispute = {
      ...input,
      id: crypto.randomUUID(),
      openedAt: Date.now(),
      pharmacyNote: null,
      pharmacyRespondedAt: null,
      status: "open",
      decisionNote: null,
      decidedBy: null,
      decidedAt: null,
    };
    store.update((items) => [dispute, ...items]);
  },

  respond(id: string, pharmacyNote: string) {
    store.update((items) =>
      items.map((item) =>
        item.id === id && item.status === "open"
          ? { ...item, pharmacyNote: pharmacyNote.trim(), pharmacyRespondedAt: Date.now() }
          : item,
      ),
    );
  },

  decide(id: string, status: Exclude<DisputeStatus, "open">, decisionNote: string, decidedBy: string) {
    store.update((items) =>
      items.map((item) =>
        item.id === id && item.status === "open"
          ? { ...item, status, decisionNote: decisionNote.trim(), decidedBy, decidedAt: Date.now() }
          : item,
      ),
    );
  },
};
