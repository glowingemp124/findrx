import type {
  AuthResult,
  Challenge,
  PharmacyAccount,
  PharmacyProfile,
  SessionAccount,
  SignUpInput,
  StatusChange,
} from "@/features/auth/types";
import { LEGACY_SEED_EMAILS, SEED_PHARMACIES } from "@/features/auth/seed-pharmacies";
import { createLoginLockout } from "@/lib/login-lockout";
import { DEFAULT_HOURS } from "@/lib/opening-hours";
import { createPersistentStore } from "@/lib/persistent-store";

const CODE_TTL_MS = 10 * 60_000;

export { DEMO_ACCOUNT } from "@/features/auth/seed-pharmacies";

const accounts = createPersistentStore<PharmacyAccount[]>("findrx-pharmacy-accounts", SEED_PHARMACIES);

/** Brings stored accounts up to the current shape and adds any seeded pharmacies that are missing. */
accounts.update((list) => {
  const upgraded = list.map((stored) => {
    const seed = SEED_PHARMACIES.find((item) => item.id === stored.id);
    const legacy = seed && LEGACY_SEED_EMAILS[stored.id] === stored.email;
    return legacy ? { ...stored, email: seed.email, password: seed.password } : stored;
  }).map((account) => ({
    ...account,
    status: account.status ?? "active",
    statusNote: account.statusNote ?? null,
    pharmacy: {
      ...account.pharmacy,
      npi: account.pharmacy.npi || SEED_PHARMACIES.find((seed) => seed.id === account.id)?.pharmacy.npi || "",
      hours: account.pharmacy.hours ?? DEFAULT_HOURS,
    },
  }));
  const missing = SEED_PHARMACIES.filter((seeded) => !upgraded.some((account) => account.id === seeded.id));
  return [...upgraded, ...missing];
});
/** The pharmacy stays signed in on this device until they sign out. A leftover tab-only session still counts. */
const rememberedSession = createPersistentStore<string | null>("findrx-session", null);
const tabSession = createPersistentStore<string | null>("findrx-tab-session", null, { storage: sessionStorage });
const lockout = createLoginLockout("findrx-lockouts");
const challengeStore = createPersistentStore<Challenge | null>("findrx-auth-challenge", null, { storage: sessionStorage });

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const createCode = () => String(Math.floor(100000 + Math.random() * 900000));
const findByEmail = (email: string) => accounts.get().find((account) => account.email === normalizeEmail(email));

function toSession({ password: _password, ...account }: PharmacyAccount): SessionAccount {
  return account;
}

function openSession(accountId: string) {
  rememberedSession.set(accountId);
  tabSession.set(null);
}

function updateAccount(id: string, recipe: (account: PharmacyAccount) => PharmacyAccount) {
  accounts.update((list) => list.map((account) => (account.id === id ? recipe(account) : account)));
}

const currentId = () => tabSession.get() ?? rememberedSession.get();

let cachedAccount: PharmacyAccount | undefined;
let cachedSession: SessionAccount | null = null;

/** Stable snapshot of the signed-in account for React. */
function sessionSnapshot(list: PharmacyAccount[], id: string | null): SessionAccount | null {
  const account = id ? list.find((item) => item.id === id) : undefined;
  if (account !== cachedAccount) {
    cachedAccount = account;
    cachedSession = account ? toSession(account) : null;
  }
  return cachedSession;
}

export const authService = {
  /** The signed-in pharmacy account, or null. Re-renders on sign in/out and profile edits. */
  useAccount(): SessionAccount | null {
    const list = accounts.use();
    const remembered = rememberedSession.use();
    const tab = tabSession.use();
    return sessionSnapshot(list, tab ?? remembered);
  },

  useChallenge: challengeStore.use,

  signIn(email: string, password: string): AuthResult {
    const key = normalizeEmail(email);
    const locked = lockout.check(key);
    if (locked) return { ok: false, error: locked };

    const account = findByEmail(email);
    if (!account || account.password !== password) {
      return { ok: false, error: lockout.fail(key, "Email or password is incorrect.") };
    }

    lockout.clear(key);
    openSession(account.id);
    return { ok: true };
  },

  signOut() {
    rememberedSession.set(null);
    tabSession.set(null);
  },

  /** Holds the new account until the emailed code is confirmed. */
  beginSignUp(input: SignUpInput): AuthResult {
    if (findByEmail(input.email)) return { ok: false, error: "An account with this email already exists. Sign in instead." };
    const email = normalizeEmail(input.email);
    challengeStore.set({
      purpose: "signup",
      email,
      code: createCode(),
      expiresAt: Date.now() + CODE_TTL_MS,
      verified: false,
      signUp: { ...input, email },
    });
    return { ok: true };
  },

  /** Always succeeds so the form never reveals which emails have accounts. */
  beginReset(email: string): AuthResult {
    const account = findByEmail(email);
    challengeStore.set({
      purpose: "reset",
      email: normalizeEmail(email),
      code: account ? createCode() : null,
      expiresAt: Date.now() + CODE_TTL_MS,
      verified: false,
    });
    return { ok: true };
  },

  resendCode(): AuthResult {
    const challenge = challengeStore.get();
    if (!challenge) return { ok: false, error: "Start again to get a new code." };
    challengeStore.set({
      ...challenge,
      code: challenge.code === null ? null : createCode(),
      expiresAt: Date.now() + CODE_TTL_MS,
    });
    return { ok: true };
  },

  /** Sign-up: creates the account and signs in. Reset: unlocks the new-password step. */
  verifyCode(code: string): AuthResult {
    const challenge = challengeStore.get();
    if (!challenge) return { ok: false, error: "Start again to get a new code." };
    if (Date.now() > challenge.expiresAt) return { ok: false, error: "This code has expired. Send a new one." };
    if (challenge.code === null || code !== challenge.code) return { ok: false, error: "That code doesn't match. Try again." };

    if (challenge.purpose === "signup" && challenge.signUp) {
      const account: PharmacyAccount = {
        ...challenge.signUp,
        id: `pharmacy-${crypto.randomUUID().slice(0, 8)}`,
        acceptingRequests: true,
        createdAt: Date.now(),
        // Every new pharmacy waits for FindRx to check its NPI.
        status: "pending",
        statusNote: null,
      };
      accounts.update((list) => [...list, account]);
      challengeStore.set(null);
      openSession(account.id);
      return { ok: true };
    }

    challengeStore.set({ ...challenge, verified: true });
    return { ok: true };
  },

  resetPassword(password: string): AuthResult {
    const challenge = challengeStore.get();
    const account = challenge && findByEmail(challenge.email);
    if (!challenge?.verified || challenge.purpose !== "reset" || !account) {
      return { ok: false, error: "Verify your code before choosing a new password." };
    }
    updateAccount(account.id, (current) => ({ ...current, password }));
    challengeStore.set(null);
    openSession(account.id);
    return { ok: true };
  },

  updatePharmacy(pharmacy: PharmacyProfile) {
    const id = currentId();
    if (id) updateAccount(id, (account) => ({ ...account, pharmacy }));
  },

  updateContact(contact: Pick<PharmacyAccount, "contactName" | "contactTitle">) {
    const id = currentId();
    if (id) updateAccount(id, (account) => ({ ...account, ...contact }));
  },

  updateAvatar(avatar: string | null) {
    const id = currentId();
    if (id) updateAccount(id, (account) => ({ ...account, avatar }));
  },

  setAcceptingRequests(acceptingRequests: boolean) {
    const id = currentId();
    if (id) updateAccount(id, (account) => ({ ...account, acceptingRequests }));
  },

  /** FindRx staff: every pharmacy account, for review and management. */
  useAllPharmacies: accounts.use,
  listAccounts: accounts.get,

  /** FindRx staff: approve, reject, ask for more information, suspend or reinstate. */
  setStatus(pharmacyId: string, change: StatusChange) {
    updateAccount(pharmacyId, (account) => ({ ...account, status: change.status, statusNote: change.note }));
  },

  /** Applies a reviewed profile change. Hours stay as the pharmacy last saved them. */
  applyProfile(pharmacyId: string, fields: Omit<PharmacyProfile, "hours">) {
    updateAccount(pharmacyId, (account) => ({
      ...account,
      pharmacy: { ...account.pharmacy, ...fields, hours: account.pharmacy.hours },
    }));
  },

  /** Creates a sign-in after FindRx has visited and confirmed the pharmacy. */
  createPharmacy(input: SignUpInput): AuthResult {
    if (findByEmail(input.email)) return { ok: false, error: "An account with this email already exists." };
    const account: PharmacyAccount = {
      ...input,
      email: normalizeEmail(input.email),
      id: `pharmacy-${crypto.randomUUID().slice(0, 8)}`,
      acceptingRequests: true,
      createdAt: Date.now(),
      status: "active",
      statusNote: "Confirmed in person by FindRx.",
    };
    accounts.update((list) => [...list, account]);
    return { ok: true };
  },

  changePassword(current: string, next: string): AuthResult {
    const account = accounts.get().find((item) => item.id === currentId());
    if (!account) return { ok: false, error: "Sign in again to change your password." };
    if (account.password !== current) return { ok: false, error: "Current password is incorrect." };
    updateAccount(account.id, (item) => ({ ...item, password: next }));
    return { ok: true };
  },
};
