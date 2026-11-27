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

export const DEFAULT_PRIVACY = `# What we collect
We collect the medication you describe, your search area, how you want to receive it, and your mobile number. Your name is optional.

# Who sees it
Pharmacies see the medication, your preferences, and a rough distance. They do not see your name or number until you connect.

# How long we keep it
We keep the request so you can look it up later with your phone number, and so FindRx can review how pharmacies handle claims.

# Texts
We text you when a pharmacy has your medication, and we text a code when you check your requests. Reply STOP to opt out.`;

export const DEFAULT_TERMS = `# What FindRx is
FindRx is an information service. We pass your request to participating pharmacies and, when one confirms it has the medication, introduce you to each other. FindRx is not a pharmacy and gives no medical advice.

# The FindRx fee
You pay one flat fee for the introduction, only after a pharmacy confirms. If the fee is $0, you connect at no charge and skip payment. The medication, any delivery, and any insurance are agreed and paid with the pharmacy directly.

# Delivery
If you ask for delivery, the pharmacy may charge its own delivery fee, limit delivery to certain areas, or not offer delivery. That fee is not charged by FindRx.

# What we don't guarantee
We don't guarantee a pharmacy's stock, price, or delivery. Your prescription must be checked directly with the pharmacy. If a pharmacy didn't have the medication, report it from your connection page and we'll review a refund.

# Your details
Pharmacies see only the medication, your preferences, and a rough distance until you connect. Your name, if you gave one, and your mobile number go only to the pharmacy you connect with.`;

export type PlatformSettings = {
  /** Flat FindRx fee in US cents. Applies to requests posted after it changes. $0 skips payment. */
  feeCents: number;
  /** Distances offered when a patient widens a search, in miles, ascending. */
  searchRadii: number[];
  /** Farthest a patient can set the search slider, in miles. */
  maxSearchMiles: number;
  /** Unused for posting. History checks always use a code. Kept so older saved settings still load. */
  requirePhoneCode: boolean;
  /** Unused. Records are kept. Kept so older saved settings still load. */
  retentionHours: number;
  /** When the daily purge runs (HH:MM, 24-hour). Display only until a backend runs it. */
  purgeTime: string;
  privacyText: string;
  termsText: string;
  smsTemplates: Record<SmsTemplateId, string>;
  updatedAt: number | null;
  updatedBy: string | null;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  feeCents: 499,
  searchRadii: [5, 10, 25, 50],
  maxSearchMiles: 50,
  requirePhoneCode: false,
  retentionHours: 24,
  purgeTime: "03:00",
  privacyText: DEFAULT_PRIVACY,
  termsText: DEFAULT_TERMS,
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
  // Posting never asks for a code. A code is only for looking up past requests.
  requirePhoneCode: false,
  maxSearchMiles: settings.maxSearchMiles ?? DEFAULT_SETTINGS.maxSearchMiles,
  privacyText: settings.privacyText || DEFAULT_PRIVACY,
  termsText: settings.termsText || DEFAULT_TERMS,
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
