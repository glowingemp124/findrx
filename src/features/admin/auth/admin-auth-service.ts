import type { AdminAccount, AdminResult, AdminSession, Permission, StaffInput } from "@/features/admin/types";
import { createLoginLockout } from "@/lib/login-lockout";
import { createPersistentStore } from "@/lib/persistent-store";

const MFA_TTL_MS = 5 * 60_000;
const day = (date: string) => new Date(`${date}T09:00:00`).getTime();

/** Mock only: the owner and a small team, so the portal can be tried straight away. */
const SEED_ADMINS: AdminAccount[] = [
  {
    id: "admin-owner",
    role: "owner",
    name: "Morgan Lee",
    email: "admin@gmail.com",
    phone: "(713) 555-0100",
    password: "admin1234",
    permissions: [],
    active: true,
    mfaEnabled: true,
    createdAt: day("2026-08-01"),
  },
  {
    id: "admin-priya",
    role: "staff",
    name: "Priya Nair",
    email: "staff@gmail.com",
    phone: "(713) 555-0101",
    password: "staff1234",
    permissions: ["pharmacy_onboarding", "pharmacy_management"],
    active: true,
    mfaEnabled: true,
    createdAt: day("2026-09-03"),
  },
  {
    id: "admin-marcus",
    role: "staff",
    name: "Marcus Webb",
    email: "marcus@findrx.example",
    phone: "(713) 555-0102",
    password: "Staff2026",
    permissions: ["support", "refunds"],
    active: true,
    mfaEnabled: true,
    createdAt: day("2026-09-10"),
  },
  {
    id: "admin-elena",
    role: "staff",
    name: "Elena Brooks",
    email: "elena@findrx.example",
    phone: "(713) 555-0103",
    password: "Staff2026",
    permissions: ["support"],
    active: true,
    mfaEnabled: true,
    createdAt: day("2026-10-02"),
  },
  {
    id: "admin-tom",
    role: "staff",
    name: "Tom Reyes",
    email: "tom@findrx.example",
    phone: "(713) 555-0104",
    password: "Staff2026",
    permissions: ["analytics", "settings"],
    active: true,
    mfaEnabled: true,
    createdAt: day("2026-10-20"),
  },
];

/** Demo logins shown on the admin sign-in page. */
export const DEMO_ADMIN_LOGINS = [
  { label: "Owner", logins: SEED_ADMINS.filter((item) => item.role === "owner") },
  { label: "Staff", logins: SEED_ADMINS.filter((item) => item.role === "staff") },
].map((group) => ({ ...group, logins: group.logins.map(({ name, email, password }) => ({ name, email, password })) }));

/** Earlier demo emails, replaced by the logins above in data saved before the change. */
const LEGACY_SEED_EMAILS: Record<string, string> = {
  "admin-owner": "owner@findrx.example",
  "admin-priya": "priya@findrx.example",
};

type MfaChallenge = { accountId: string; code: string; expiresAt: number };

const accounts = createPersistentStore<AdminAccount[]>("findrx-admin-accounts", SEED_ADMINS);
const session = createPersistentStore<string | null>("findrx-admin-session", null, { storage: sessionStorage });
const challenge = createPersistentStore<MfaChallenge | null>("findrx-admin-mfa", null, { storage: sessionStorage });
const lockout = createLoginLockout("findrx-admin-lockouts");

/** Brings stored accounts up to date: current demo logins and fields added later. */
accounts.update((current) => {
  const missing = SEED_ADMINS.filter((seed) => !current.some((account) => account.id === seed.id));
  const list = [...SEED_ADMINS.filter((seed) => missing.includes(seed)), ...current];
  return list.map((stored) => {
    const seed = SEED_ADMINS.find((item) => item.id === stored.id);
    const legacy = seed && LEGACY_SEED_EMAILS[stored.id] === stored.email;
    return {
      ...stored,
      ...(legacy ? { email: seed.email, password: seed.password } : {}),
      mfaEnabled: stored.mfaEnabled ?? true,
    };
  });
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const findByEmail = (email: string) => accounts.get().find((account) => account.email === normalizeEmail(email));
const createCode = () => String(Math.floor(100000 + Math.random() * 900000));

function update(id: string, recipe: (account: AdminAccount) => AdminAccount) {
  accounts.update((list) => list.map((account) => (account.id === id ? recipe(account) : account)));
}

function strip({ password: _password, ...account }: AdminAccount): AdminSession {
  return account;
}

let cachedAccount: AdminAccount | undefined;
let cachedSession: AdminSession | null = null;
let cachedList: AdminAccount[] | undefined;
let cachedTeam: AdminSession[] = [];

const signedIn = () => accounts.get().find((account) => account.id === session.get() && account.active);

/** Owner first, then staff by name. */
const byRole = (a: AdminAccount, b: AdminAccount) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "owner" ? -1 : 1);

export const adminAuth = {
  /** The signed-in FindRx team member, or null. Deactivating someone signs them out. */
  useAccount(): AdminSession | null {
    const list = accounts.use();
    const id = session.use();
    const account = list.find((item) => item.id === id && item.active);
    if (account !== cachedAccount) {
      cachedAccount = account;
      cachedSession = account ? strip(account) : null;
    }
    return cachedSession;
  },

  /** Everyone on the team, without passwords. */
  useTeam(): AdminSession[] {
    const list = accounts.use();
    if (list !== cachedList) {
      cachedList = list;
      cachedTeam = [...list].sort(byRole).map(strip);
    }
    return cachedTeam;
  },

  useChallenge: challenge.use,

  /** Step 1: email and password. Returns whether an MFA code is needed next. */
  signIn(email: string, password: string): AdminResult & { mfa?: boolean } {
    const key = normalizeEmail(email);
    const locked = lockout.check(key);
    if (locked) return { ok: false, error: locked };
    const account = findByEmail(email);
    if (!account || account.password !== password) {
      return { ok: false, error: lockout.fail(key, "Email or password is incorrect.") };
    }
    if (!account.active) return { ok: false, error: "This account has been deactivated. Ask the Owner to restore it." };
    lockout.clear(key);
    if (account.mfaEnabled === false) {
      session.set(account.id);
      return { ok: true, mfa: false };
    }
    challenge.set({ accountId: account.id, code: createCode(), expiresAt: Date.now() + MFA_TTL_MS });
    return { ok: true, mfa: true };
  },

  /** Step 2: the authenticator code. */
  verifyMfa(code: string): AdminResult {
    const pending = challenge.get();
    if (!pending) return { ok: false, error: "Sign in again to get a new code." };
    if (Date.now() > pending.expiresAt) return { ok: false, error: "This code has expired. Sign in again." };
    if (code !== pending.code) return { ok: false, error: "That code doesn't match. Try again." };
    challenge.set(null);
    session.set(pending.accountId);
    return { ok: true };
  },

  cancelMfa() {
    challenge.set(null);
  },

  signOut() {
    session.set(null);
  },

  updateProfile(changes: Pick<AdminAccount, "name" | "phone">) {
    const account = signedIn();
    if (account) update(account.id, (current) => ({ ...current, name: changes.name.trim(), phone: changes.phone.trim() }));
  },

  updateAvatar(avatar: string | null) {
    const account = signedIn();
    if (account) update(account.id, (current) => ({ ...current, avatar }));
  },

  /** Turning MFA off needs the current password; turning it on doesn't. */
  setMfa(enabled: boolean, password?: string): AdminResult {
    const account = signedIn();
    if (!account) return { ok: false, error: "Sign in again to change this." };
    if (!enabled && account.password !== password) return { ok: false, error: "Password is incorrect." };
    update(account.id, (item) => ({ ...item, mfaEnabled: enabled }));
    return { ok: true };
  },

  changePassword(current: string, next: string): AdminResult {
    const account = signedIn();
    if (!account) return { ok: false, error: "Sign in again to change your password." };
    if (account.password !== current) return { ok: false, error: "Current password is incorrect." };
    update(account.id, (item) => ({ ...item, password: next }));
    return { ok: true };
  },

  /** Owner only. The staff member signs in with these details. */
  createStaff(input: StaffInput): AdminResult {
    if (signedIn()?.role !== "owner") return { ok: false, error: "Only the Owner can add staff." };
    if (findByEmail(input.email)) return { ok: false, error: "Someone on the team already uses this email." };
    const account: AdminAccount = {
      ...input,
      id: `admin-${crypto.randomUUID().slice(0, 8)}`,
      role: "staff",
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      phone: input.phone.trim(),
      active: true,
      mfaEnabled: true,
      createdAt: Date.now(),
    };
    accounts.update((list) => [...list, account]);
    return { ok: true };
  },

  /** Owner only. Email stays fixed; it's the sign-in identity. A blank password leaves it unchanged. */
  updateStaff(id: string, changes: Pick<AdminAccount, "name" | "phone" | "active"> & { password?: string }): AdminResult {
    if (signedIn()?.role !== "owner") return { ok: false, error: "Only the Owner can edit staff." };
    update(id, (account) =>
      account.role === "owner"
        ? account
        : {
            ...account,
            name: changes.name.trim(),
            phone: changes.phone.trim(),
            active: changes.active,
            password: changes.password ? changes.password : account.password,
          },
    );
    return { ok: true };
  },

  setPermission(id: string, permission: Permission, granted: boolean) {
    if (signedIn()?.role !== "owner") return;
    update(id, (account) => ({
      ...account,
      permissions: granted
        ? [...new Set([...account.permissions, permission])]
        : account.permissions.filter((item) => item !== permission),
    }));
  },

  removeStaff(id: string): AdminResult {
    if (signedIn()?.role !== "owner") return { ok: false, error: "Only the Owner can remove staff." };
    accounts.update((list) => list.filter((account) => account.id !== id || account.role === "owner"));
    return { ok: true };
  },
};
