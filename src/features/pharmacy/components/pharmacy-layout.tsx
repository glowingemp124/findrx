import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { AccountMenu } from "@/components/layout/account-menu";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { authService } from "@/features/auth/auth-service";
import { PharmacyStatusScreen } from "@/features/pharmacy/components/pharmacy-status-screen";
import { PharmacyWorkspaceProvider, usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";
import { cn } from "@/lib/cn";

function PharmacyShell() {
  const { account, feed, stats } = usePharmacyWorkspace();
  const navigate = useNavigate();
  const contact = [account.contactName, account.contactTitle].filter(Boolean).join(", ");

  return (
    <DashboardShell
      homeTo={paths.pharmacy.home}
      subtitle="Pharmacy portal"
      nav={[
        { to: paths.pharmacy.dashboard, label: "Dashboard", icon: "dashboard" },
        { to: paths.pharmacy.requests, label: "Live requests", icon: "inbox", badge: feed.length },
        { to: paths.pharmacy.claims, label: "My claims", icon: "clipboardCheck", badge: stats.needsAttention },
        { to: paths.pharmacy.history, label: "History", icon: "history" },
        { to: paths.pharmacy.medications, label: "Import medications", icon: "upload" },
        { to: paths.pharmacy.settings, label: "Settings", icon: "settings" },
      ]}
      footer={
        <div className="grid gap-1 text-sm text-side-muted">
          <p className="font-semibold text-side-ink">{account.pharmacy.name}</p>
          <p>{contact}</p>
          <p>
            Status:{" "}
            <span className={cn("font-semibold", account.acceptingRequests ? "text-good" : "text-warn")}>
              {account.acceptingRequests ? "Accepting requests" : "Paused"}
            </span>
          </p>
        </div>
      }
      headerActions={
        <AccountMenu
          name={account.contactName}
          avatarUrl={account.avatar}
          detail={[account.contactTitle, account.pharmacy.name].filter(Boolean).join(" · ")}
          email={account.email}
          items={[
            { label: "Profile", icon: "user", to: paths.pharmacy.settings },
            { label: "Change password", icon: "keyRound", to: paths.pharmacy.settingsPassword },
            {
              label: "Sign out",
              icon: "logOut",
              tone: "danger",
              onSelect: () => {
                authService.signOut();
                navigate(paths.auth.signIn, { replace: true });
              },
            },
          ]}
        />
      }
    />
  );
}

/** Pharmacy side: shell, nav badges and live data. Rendered inside `RequireAuth`. */
export function PharmacyLayout() {
  const account = authService.useAccount();
  if (!account) return null;
  if (account.status !== "active") return <PharmacyStatusScreen account={account} />;
  return (
    <PharmacyWorkspaceProvider account={account}>
      <PharmacyShell />
    </PharmacyWorkspaceProvider>
  );
}
