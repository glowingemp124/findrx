import type { PharmacyAccount } from "@/features/auth/types";

export type RegistryRecord = {
  legalName: string;
  address: string;
  phone: string;
  npi: string;
  providerType: string;
  status: "Active" | "Deactivated";
};

export type ComparisonRow = { field: string; applicant: string; registry: string; match: boolean };

/** NPIs use the Luhn check digit over "80840" + the first nine digits. */
export function isValidNpi(npi: string) {
  if (!/^\d{10}$/.test(npi)) return false;
  const digits = `80840${npi}`.split("").map(Number);
  const sum = digits.reverse().reduce((total, digit, index) => {
    if (index % 2 === 0) return total + digit;
    const doubled = digit * 2;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return sum % 10 === 0;
}

const addressOf = ({ pharmacy }: Pick<PharmacyAccount, "pharmacy">) =>
  `${pharmacy.street}, ${pharmacy.city}, ${pharmacy.state} ${pharmacy.zip}`;

/** Known differences in the mock registry, keyed by NPI, so the review queue has realistic cases. */
const REGISTRY_OVERRIDES: Record<string, Partial<RegistryRecord>> = {
  "1548203917": { address: "77 Grove Ave, Austin, TX 78745" },
  "1999999999": { providerType: "Individual (taxonomy 207Q00000X)" },
};

/** Seeded pharmacies were added by hand, so they're "in the registry" even if their NPI is made up. */
const SEEDED_IDS = new Set([
  "1902734658", "1427630985", "1336204871", "1588046213", "1093817264",
  "1548203917", "1730482615", "1265093841", "1999999999", "1457392018",
]);

/**
 * Mock NPI registry (NPPES) lookup. Returns null when the NPI isn't found.
 * Replace with a server-side call to the NPPES API.
 */
export function lookupNpi(account: Pick<PharmacyAccount, "pharmacy">): RegistryRecord | null {
  const { npi } = account.pharmacy;
  if (!SEEDED_IDS.has(npi) && !isValidNpi(npi)) return null;
  return {
    legalName: `${account.pharmacy.name} LLC`,
    address: addressOf(account),
    phone: account.pharmacy.phone,
    npi,
    providerType: "Pharmacy (taxonomy 3336C0003X)",
    status: "Active",
    ...REGISTRY_OVERRIDES[npi],
  };
}

const normalize = (value: string) => value.toLowerCase().replace(/\b(llc|inc|corp)\b/g, "").replace(/[^a-z0-9]/g, "");

export function compareWithRegistry(account: Pick<PharmacyAccount, "pharmacy">, record: RegistryRecord): ComparisonRow[] {
  const applicantAddress = addressOf(account);
  return [
    { field: "Legal name", applicant: account.pharmacy.name, registry: record.legalName, match: normalize(account.pharmacy.name) === normalize(record.legalName) },
    { field: "Address", applicant: applicantAddress, registry: record.address, match: normalize(applicantAddress) === normalize(record.address) },
    { field: "Phone", applicant: account.pharmacy.phone, registry: record.phone, match: normalize(account.pharmacy.phone) === normalize(record.phone) },
    { field: "NPI", applicant: account.pharmacy.npi, registry: record.npi, match: account.pharmacy.npi === record.npi },
    { field: "Provider type", applicant: "Pharmacy", registry: record.providerType, match: record.providerType.startsWith("Pharmacy") },
    { field: "Registry status", applicant: "–", registry: record.status, match: record.status === "Active" },
  ];
}

export type NpiCheckSummary = { kind: "not_run" } | { kind: "not_found" } | { kind: "match" } | { kind: "mismatch"; count: number };

export function summarizeCheck(account: Pick<PharmacyAccount, "pharmacy">, checked: boolean): NpiCheckSummary {
  if (!checked) return { kind: "not_run" };
  const record = lookupNpi(account);
  if (!record) return { kind: "not_found" };
  const count = compareWithRegistry(account, record).filter((row) => !row.match).length;
  return count === 0 ? { kind: "match" } : { kind: "mismatch", count };
}
