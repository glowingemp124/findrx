import type { MedicationForm } from "@/features/requests/types";

export type CatalogEntry = {
  /** Name written into the request. */
  name: string;
  /** Brand, generic and common misspellings that should resolve to this entry. */
  aliases: string[];
  doses: string[];
  forms: MedicationForm[];
};

/** Mock catalog for the AI assistant. A real drug database (with NDC lookup) replaces this. */
export const MEDICATION_CATALOG: CatalogEntry[] = [
  { name: "Metformin", aliases: ["metformin", "glucophage", "metformin hcl"], doses: ["500 mg", "850 mg", "1000 mg"], forms: ["tablet"] },
  { name: "Semaglutide (Ozempic)", aliases: ["ozempic", "semaglutide"], doses: ["0.25 mg", "0.5 mg", "1 mg", "2 mg"], forms: ["injection"] },
  { name: "Semaglutide (Wegovy)", aliases: ["wegovy"], doses: ["0.25 mg", "1 mg", "1.7 mg", "2.4 mg"], forms: ["injection"] },
  { name: "Amoxicillin", aliases: ["amoxicillin", "amoxil", "amoxicilin"], doses: ["250 mg", "500 mg", "875 mg"], forms: ["capsule", "tablet", "liquid"] },
  { name: "Lisinopril", aliases: ["lisinopril", "zestril", "prinivil"], doses: ["5 mg", "10 mg", "20 mg"], forms: ["tablet"] },
  { name: "Albuterol", aliases: ["albuterol", "ventolin", "proair"], doses: ["90 mcg"], forms: ["inhaler"] },
  { name: "Amphetamine salts (Adderall)", aliases: ["adderall", "amphetamine"], doses: ["10 mg", "20 mg", "30 mg"], forms: ["tablet", "capsule"] },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Finds a catalog entry mentioned anywhere in free text. */
export function findMedication(text: string): CatalogEntry | undefined {
  const haystack = ` ${normalize(text)} `;
  return MEDICATION_CATALOG.find((entry) => entry.aliases.some((alias) => haystack.includes(` ${alias} `)));
}

/** NDC codes look like 12345-678-90 (10 or 11 digits with dashes). */
export const looksLikeNdc = (text: string) => /\b\d{4,5}-\d{3,4}-\d{1,2}\b/.test(text);
