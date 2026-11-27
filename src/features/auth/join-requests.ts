import type { PharmacyProfile } from "@/features/auth/types";
import { createPersistentStore } from "@/lib/persistent-store";

export type JoinRequest = {
  id: string;
  submittedAt: number;
  status: "new" | "approved" | "declined";
  pharmacy: PharmacyProfile;
  contactName: string;
  contactTitle: string;
  email: string;
  note: string;
};

const store = createPersistentStore<JoinRequest[]>("findrx-join-requests", []);

/** A pharmacy asking to join. This is not an account and cannot sign in. */
export const joinRequests = {
  use: store.use,

  submit(input: Omit<JoinRequest, "id" | "submittedAt" | "status">) {
    const email = input.email.trim().toLowerCase();
    if (store.get().some((item) => item.email === email && item.status === "new")) {
      return { ok: false as const, error: "A request with this email is already waiting for FindRx." };
    }
    const request: JoinRequest = { ...input, email, id: crypto.randomUUID(), submittedAt: Date.now(), status: "new" };
    store.update((items) => [request, ...items]);
    return { ok: true as const };
  },

  mark(id: string, status: "approved" | "declined") {
    store.update((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
  },
};
