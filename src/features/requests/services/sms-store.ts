import { createPersistentStore } from "@/lib/persistent-store";
import type { SmsMessage } from "@/features/requests/types";

const store = createPersistentStore<SmsMessage[]>("findrx-sms", []);

/** Mock SMS outbox. Stands in for the real SMS provider and feeds the notifications widget. */
export const smsStore = {
  use: store.use,
  send(body: string, extras: Pick<SmsMessage, "link" | "code"> = {}) {
    const message: SmsMessage = { id: crypto.randomUUID(), sentAt: Date.now(), body, ...extras, read: false };
    store.update((messages) => [...messages, message]);
  },
  markAllRead() {
    store.update((messages) => (messages.some((m) => !m.read) ? messages.map((m) => ({ ...m, read: true })) : messages));
  },
  clear() {
    store.set([]);
  },
};
