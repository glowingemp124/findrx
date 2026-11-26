import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { AccountMenu } from "@/components/layout/account-menu";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { allowedModules } from "@/features/admin/lib/permissions";
import { authService } from "@/features/auth/auth-service";
import { transactionStore } from "@/features/requests/services/transaction-store";

/** Admin side: sidebar limited to the person's modules, account menu, and review badges. */
export function AdminLayout() {
  const account = adminAuth.useAccount();
  const pharmacies = authService.useAllPharmacies();
  const navigate = useNavigate();

  useEffect(() => transactionStore.seedHistory(Date.now()), []);

  const awaitingReview = useMemo(() => pharmacies.filter((item) => item.status === "pending").length, [pharmacies]);

  if (!account) return null;
  const role = account.role === "owner" ? "Owner" : "Staff";

  return (
    <DashboardShell
      homeTo={paths.admin.home}
      subtitle="Admin portal"
      nav={allowedModules(account).map((module) => ({
        to: module.to,
        label: module.label,
        icon: module.icon,
        badge: module.id === "pharmacies" ? awaitingReview : undefined,
      }))}
      footer={
        <p className="text-sm text-side-muted">
          Signed in as <span className="font-semibold text-side-ink">{role}</span> · MFA {account.mfaEnabled === false ? "off" : "on"}
        </p>
      }
      headerActions={
        <AccountMenu
          name={account.name}
          avatarUrl={account.avatar}
          detail={role}
          email={account.email}
          items={[
            { label: "Profile", icon: "user", to: paths.admin.profile },
            { label: "Change password", icon: "keyRound", to: paths.admin.profilePassword },
            {
              label: "Sign out",
              icon: "logOut",
              tone: "danger",
              onSelect: () => {
                adminAuth.signOut();
                navigate(paths.admin.login, { replace: true });
              },
            },
          ]}
        />
      }
    />
  );
}
