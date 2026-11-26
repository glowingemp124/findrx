import { createPersistentStore } from "@/lib/persistent-store";

/** Every distance the platform can offer; the admin picks which ones clients see. */
export const ALL_SEARCH_RADII = [5, 10, 15, 25, 50, 100] as const;

export type SmsTemplateId = "verification_code" | "pharmacy_found" | "no_match" | "pharmacy_details";

export const SMS_TEMPLATES: Array<{ id: SmsTemplateId; label: string; placeholders: string[] }> = [
  { id: "verification_code", label: "Phone code", placeholders: ["code"] },
  { id: "pharmacy_found", label: "Pharmacy found", placeholders: ["fee"] },
  { id: "no_match", label: "No pharmacy yet (30 min)", placeholders: [] },
  { id: "pharmacy_details", label: "Pharmacy details", placeholders: ["pharmacy", "address", "phone"] },
];

export type PlatformSettings = {
  /** Flat FindRx fee in US cents. Applies to requests posted after it changes. */
  feeCents: number;
  /** Distances offered to clients, in miles, ascending. */
  searchRadii: number[];
  /** Clients confirm their phone with a texted code before a request is posted. */
  requirePhoneCode: boolean;
  /** Request details are deleted this many hours after a request closes. */
  retentionHours: number;
  /** When the daily purge runs (HH:MM, 24-hour). Display only until a backend runs it. */
  purgeTime: string;
  smsTemplates: Record<SmsTemplateId, string>;
  updatedAt: number | null;
  updatedBy: string | null;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  feeCents: 499,
  searchRadii: [5, 10, 25, 50],
  requirePhoneCode: true,
  retentionHours: 24,
  purgeTime: "03:00",
  smsTemplates: {
    verification_code: "Your FindRx code is {code}. It expires in 10 minutes.",
    pharmacy_found: "Good news: a pharmacy near you has your medication. Pay the {fee} fee within 1 hour to get its details:",
    no_match: "No pharmacy has confirmed your medication yet. Search a wider area, or close your request at no charge:",
    pharmacy_details: "You're connected to {pharmacy}, {address}. Call {phone}. They have your name and number.",
  },
  updatedAt: null,
  updatedBy: null,
};

const store = createPersistentStore<PlatformSettings>("findrx-platform-settings", DEFAULT_SETTINGS);

/** Fills in settings added after the stored copy was saved. */
const withDefaults = (settings: PlatformSettings): PlatformSettings => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  smsTemplates: { ...DEFAULT_SETTINGS.smsTemplates, ...settings.smsTemplates },
});

let cachedRaw: PlatformSettings | undefined;
let cached: PlatformSettings = DEFAULT_SETTINGS;
const snapshot = (raw: PlatformSettings) => {
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = withDefaults(raw);
  }
  return cached;
};

/** Platform rules set by the admin. The client site and request lifecycle read them live. */
export const platformSettings = {
  use: () => snapshot(store.use()),
  get: () => snapshot(store.get()),
  save(next: Omit<PlatformSettings, "updatedAt" | "updatedBy">, updatedBy: string) {
    store.set({ ...next, searchRadii: [...next.searchRadii].sort((a, b) => a - b), updatedAt: Date.now(), updatedBy });
  },
  retentionMs: () => snapshot(store.get()).retentionHours * 60 * 60_000,
};

/** Fills {placeholders}; unknown ones are left as written. */
export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/** Placeholders a template must keep. */
export function missingPlaceholders(id: SmsTemplateId, text: string) {
  const required = SMS_TEMPLATES.find((template) => template.id === id)?.placeholders ?? [];
  return required.filter((name) => !text.includes(`{${name}}`));
}
