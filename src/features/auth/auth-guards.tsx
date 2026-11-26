import { Navigate, Outlet, useLocation } from "react-router-dom";
import { paths } from "@/app/paths";
import { authService } from "@/features/auth/auth-service";

/** Pharmacy pages. Signed-out visitors go to sign in and come back afterwards. */
export function RequireAuth() {
  const account = authService.useAccount();
  const location = useLocation();
  if (!account) return <Navigate to={paths.auth.signIn} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Auth pages. Signed-in pharmacies go straight to their dashboard. */
export function GuestOnly() {
  const account = authService.useAccount();
  if (account) return <Navigate to={paths.pharmacy.home} replace />;
  return <Outlet />;
}
