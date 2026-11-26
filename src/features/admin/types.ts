export const PERMISSIONS = [
  { id: "pharmacy_onboarding", label: "Pharmacy onboarding", description: "Review new pharmacies: approve, reject or ask for more information." },
  { id: "pharmacy_management", label: "Pharmacy management", description: "Suspend and reinstate pharmacies in the network." },
  { id: "support", label: "Support", description: "Look up transactions and the requests behind them." },
  { id: "refunds", label: "Refunds", description: "Refund FindRx fees." },
  { id: "analytics", label: "Analytics", description: "See the dashboard and export reports." },
  { id: "settings", label: "Settings", description: "Change platform rules: fee, distances, retention and texts." },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["id"];

export type AdminRole = "owner" | "staff";

export type AdminAccount = {
  id: string;
  role: AdminRole;
  name: string;
  email: string;
  phone: string;
  /** Mock only. A real backend never sends or stores plain passwords on the client. */
  password: string;
  /** Ignored for the owner, who always holds every permission. */
  permissions: Permission[];
  /** Deactivated staff can't sign in. The owner can't be deactivated. */
  active: boolean;
  /** Two-step sign-in with an authenticator code. Older stored accounts without the field count as on. */
  mfaEnabled: boolean;
  /** Profile photo as a small data URL. */
  avatar?: string | null;
  createdAt: number;
};

export type AdminSession = Omit<AdminAccount, "password">;

export type AdminResult = { ok: true } | { ok: false; error: string };

export type StaffInput = Pick<AdminAccount, "name" | "email" | "phone" | "password" | "permissions">;
