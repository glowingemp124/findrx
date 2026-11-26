import type { PharmacyAccount } from "@/features/auth/types";
import { DEFAULT_HOURS } from "@/lib/opening-hours";

const day = (date: string) => new Date(`${date}T10:00:00`).getTime();

type Seed = Omit<PharmacyAccount, "pharmacy" | "acceptingRequests" | "statusNote"> & {
  pharmacy: Omit<PharmacyAccount["pharmacy"], "hours" | "canCompound"> & { canCompound?: boolean };
  statusNote?: string;
};

const seed = ({ pharmacy, statusNote, ...account }: Seed): PharmacyAccount => ({
  ...account,
  pharmacy: { canCompound: false, hours: DEFAULT_HOURS, ...pharmacy },
  acceptingRequests: true,
  statusNote: statusNote ?? null,
});

/** Seeded so the portal can be tried without signing up. */
export const DEMO_ACCOUNT: PharmacyAccount = seed({
  id: "pharmacy-riverbend",
  email: "pharmacy01@gmail.com",
  password: "pharmacy1234",
  contactName: "Ava Chen",
  contactTitle: "PharmD",
  pharmacy: {
    name: "Riverbend Pharmacy",
    npi: "1902734658",
    phone: "(713) 555-0186",
    street: "1420 Washington Ave",
    city: "Houston",
    state: "TX",
    zip: "77007",
    canCompound: true,
  },
  createdAt: day("2026-11-02"),
  status: "active",
});

/** Earlier demo emails, replaced by the logins above in data saved before the change. */
export const LEGACY_SEED_EMAILS: Record<string, string> = {
  "pharmacy-riverbend": "ava@riverbendrx.example",
  "pharmacy-northside": "leo@northsiderx.example",
};

/** Mock only: the rest of the network, so the admin has a review queue and a directory. */
export const SEED_PHARMACIES: PharmacyAccount[] = [
  DEMO_ACCOUNT,
  seed({
    id: "pharmacy-northside",
    email: "pharmacy02@gmail.com",
    password: "pharmacy1234",
    contactName: "Leo Grant",
    contactTitle: "RPh",
    pharmacy: { name: "Northside Family Pharmacy", npi: "1427630985", phone: "(512) 555-0131", street: "4500 N Lamar Blvd", city: "Austin", state: "TX", zip: "78751" },
    createdAt: day("2026-11-05"),
    status: "active",
  }),
  seed({
    id: "pharmacy-eastgate",
    email: "nina@eastgaterx.example",
    password: "Eastgate2026",
    contactName: "Nina Ortiz",
    contactTitle: "PharmD",
    pharmacy: { name: "Eastgate Pharmacy", npi: "1336204871", phone: "(713) 555-0177", street: "910 Gessner Rd", city: "Houston", state: "TX", zip: "77024" },
    createdAt: day("2026-10-21"),
    status: "active",
  }),
  seed({
    id: "pharmacy-bellaire",
    email: "raj@bellairerx.example",
    password: "Bellaire2026",
    contactName: "Raj Mehta",
    contactTitle: "PharmD",
    pharmacy: { name: "Bellaire Compounding", npi: "1588046213", phone: "(713) 555-0109", street: "5115 Bellaire Blvd", city: "Bellaire", state: "TX", zip: "77401", canCompound: true },
    createdAt: day("2026-10-14"),
    status: "active",
  }),
  seed({
    id: "pharmacy-harbor",
    email: "dana@harborstreetrx.example",
    password: "Harbor2026",
    contactName: "Dana Ruiz",
    contactTitle: "PharmD",
    pharmacy: { name: "Harbor Street Pharmacy", npi: "1093817264", phone: "(512) 555-0148", street: "220 Harbor St, Suite 4", city: "Houston", state: "TX", zip: "77002" },
    createdAt: day("2026-11-18"),
    status: "pending",
  }),
  seed({
    id: "pharmacy-maple",
    email: "owen@maplegrove.example",
    password: "Maple2026",
    contactName: "Owen Park",
    contactTitle: "RPh",
    pharmacy: { name: "Maple Grove Apothecary", npi: "1548203917", phone: "(512) 555-0162", street: "77 Grove Ave", city: "Austin", state: "TX", zip: "78704" },
    createdAt: day("2026-11-19"),
    status: "pending",
  }),
  seed({
    id: "pharmacy-bayou",
    email: "lena@bayourx.example",
    password: "Bayou2026",
    contactName: "Lena Moss",
    contactTitle: "PharmD",
    pharmacy: { name: "Bayou Compounding Rx", npi: "1730482615", phone: "(713) 555-0155", street: "3300 Montrose Blvd", city: "Houston", state: "TX", zip: "77006", canCompound: true },
    createdAt: day("2026-11-21"),
    status: "pending",
  }),
  seed({
    id: "pharmacy-cedar",
    email: "sam@cedarlane.example",
    password: "Cedar2026",
    contactName: "Sam Patel",
    contactTitle: "RPh",
    pharmacy: { name: "Cedar Lane Drugs", npi: "1265093841", phone: "(214) 555-0120", street: "1800 Main St", city: "Dallas", state: "TX", zip: "75201" },
    createdAt: day("2026-11-23"),
    status: "pending",
  }),
  seed({
    id: "pharmacy-gulf",
    email: "max@gulfcoast.example",
    password: "Gulf2026",
    contactName: "Max Hale",
    contactTitle: "",
    pharmacy: { name: "Gulf Coast Wellness", npi: "1999999999", phone: "(409) 555-0190", street: "12 Seawall Blvd", city: "Galveston", state: "TX", zip: "77550" },
    createdAt: day("2026-11-10"),
    status: "rejected",
    statusNote: "The NPI belongs to an individual provider, not a pharmacy.",
  }),
  seed({
    id: "pharmacy-pine",
    email: "ivy@pinehollow.example",
    password: "Pine2026",
    contactName: "Ivy Chen",
    contactTitle: "PharmD",
    pharmacy: { name: "Pine Hollow Pharmacy", npi: "1457392018", phone: "(936) 555-0114", street: "45 Pine St", city: "Conroe", state: "TX", zip: "77301" },
    createdAt: day("2026-09-30"),
    status: "suspended",
    statusNote: "Three claims without stock in one week.",
  }),
];

const STATUS_HINT: Record<PharmacyAccount["status"], string> = {
  active: "",
  pending: " · pending review",
  info_requested: " · info requested",
  rejected: " · rejected",
  suspended: " · suspended",
};

/** Demo logins shown on the sign-in page: the two main demo pharmacies, then everyone else (to try each review state). */
export const DEMO_PHARMACY_LOGINS = [
  {
    label: "Pharmacy",
    logins: SEED_PHARMACIES.map(({ pharmacy, status, email, password }) => ({
      name: `${pharmacy.name}${STATUS_HINT[status]}`,
      email,
      password,
    })),
  },
];
