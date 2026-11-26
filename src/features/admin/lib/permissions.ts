import { paths } from "@/app/paths";
import type { IconName } from "@/components/icons";
import type { AdminSession, Permission } from "@/features/admin/types";

export const can = (account: Pick<AdminSession, "role" | "permissions">, permission: Permission) =>
  account.role === "owner" || account.permissions.includes(permission);

export type AdminModule = "dashboard" | "pharmacies" | "transactions" | "staff" | "settings";

type ModuleDef = { id: AdminModule; label: string; icon: IconName; to: string; allowed: (account: AdminSession) => boolean };

/** Which permission opens which module. Profile is open to everyone. */
export const ADMIN_MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", to: paths.admin.dashboard, allowed: (a) => can(a, "analytics") },
  {
    id: "pharmacies",
    label: "Pharmacies",
    icon: "building",
    to: paths.admin.pharmacies,
    allowed: (a) => can(a, "pharmacy_onboarding") || can(a, "pharmacy_management"),
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: "receipt",
    to: paths.admin.transactions,
    allowed: (a) => can(a, "support") || can(a, "refunds"),
  },
  { id: "staff", label: "Staff", icon: "shield", to: paths.admin.staff, allowed: (a) => a.role === "owner" },
  { id: "settings", label: "Settings", icon: "settings", to: paths.admin.settings, allowed: (a) => can(a, "settings") },
];

export const allowedModules = (account: AdminSession) => ADMIN_MODULES.filter((module) => module.allowed(account));

/** Where to land after sign-in: the first module the person can open, or their profile. */
export const adminHomeFor = (account: AdminSession) => allowedModules(account)[0]?.to ?? paths.admin.profile;
