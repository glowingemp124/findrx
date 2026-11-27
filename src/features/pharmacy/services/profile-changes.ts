import type { PharmacyProfile } from "@/features/auth/types";
import { createPersistentStore } from "@/lib/persistent-store";

export type ProfileFields = Omit<PharmacyProfile, "hours">;

export type ProfileChange = {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  submittedAt: number;
  status: "pending" | "approved" | "rejected";
  proposed: ProfileFields;
  decidedAt: number | null;
  decidedBy: string | null;
};

const store = createPersistentStore<ProfileChange[]>("findrx-profile-changes", []);

export const profileFields = ({ hours: _hours, ...fields }: PharmacyProfile): ProfileFields => fields;

const same = (a: ProfileFields, b: ProfileFields) => JSON.stringify(a) === JSON.stringify(b);

export const profileChanges = {
  use: store.use,
  pendingFor: (pharmacyId: string) => store.get().find((item) => item.pharmacyId === pharmacyId && item.status === "pending"),

  submit(pharmacyId: string, pharmacyName: string, current: ProfileFields, proposed: ProfileFields) {
    if (same(current, proposed)) return { ok: false as const, error: "Nothing changed." };
    const existing = profileChanges.pendingFor(pharmacyId);
    if (existing) {
      store.update((items) =>
        items.map((item) => (item.id === existing.id ? { ...item, proposed, pharmacyName, submittedAt: Date.now() } : item)),
      );
      return { ok: true as const };
    }
    const change: ProfileChange = {
      id: crypto.randomUUID(),
      pharmacyId,
      pharmacyName,
      submittedAt: Date.now(),
      status: "pending",
      proposed,
      decidedAt: null,
      decidedBy: null,
    };
    store.update((items) => [change, ...items]);
    return { ok: true as const };
  },

  decide(id: string, status: "approved" | "rejected", decidedBy: string) {
    store.update((items) =>
      items.map((item) => (item.id === id && item.status === "pending" ? { ...item, status, decidedBy, decidedAt: Date.now() } : item)),
    );
  },
};
