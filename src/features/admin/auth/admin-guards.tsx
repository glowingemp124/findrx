import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { paths } from "@/app/paths";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { adminHomeFor, type AdminModule, ADMIN_MODULES } from "@/features/admin/lib/permissions";

/** Admin pages. Signed-out visitors go to the admin login. */
export function RequireAdmin() {
  const account = adminAuth.useAccount();
  const location = useLocation();
  if (!account) return <Navigate to={paths.admin.login} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Admin login and MFA. Signed-in staff go to their first module. */
export function AdminGuestOnly() {
  const account = adminAuth.useAccount();
  if (account) return <Navigate to={adminHomeFor(account)} replace />;
  return <Outlet />;
}

/** Sends people without access to a module to one they can open. */
export function RequireModule({ module, children }: { module: AdminModule; children: ReactNode }) {
  const account = adminAuth.useAccount();
  if (!account) return null;
  const allowed = ADMIN_MODULES.find((item) => item.id === module)?.allowed(account);
  if (!allowed) return <Navigate to={adminHomeFor(account)} replace />;
  return <>{children}</>;
}

export function AdminIndexRedirect() {
  const account = adminAuth.useAccount();
  return account ? <Navigate to={adminHomeFor(account)} replace /> : null;
}
