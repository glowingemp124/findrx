import { useState, type FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { ChangePasswordPanel } from "@/components/layout/change-password-panel";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { PasswordField } from "@/components/ui/password-field";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Switch } from "@/components/ui/switch";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { can } from "@/features/admin/lib/permissions";
import { PERMISSIONS, type AdminSession } from "@/features/admin/types";
import { hasErrors, type FieldErrors } from "@/features/auth/validation";
import { isUsMobile } from "@/features/client/lib/validate-draft";
import { useToast } from "@/lib/toast";

function SecurityPanel({ account }: { account: AdminSession }) {
  const { push } = useToast();
  const enabled = account.mfaEnabled !== false;
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const turnOff = (event: FormEvent) => {
    event.preventDefault();
    const result = adminAuth.setMfa(false, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirming(false);
    setPassword("");
    setError("");
    push("Two-step verification is off.", { tone: "warn" });
  };

  return (
    <Panel title="Two-step verification" subtitle="Ask for a code from your authenticator app after your password." delay={60}>
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-4 rounded-[16px] bg-side-well p-4">
          <div>
            <p className="font-semibold">{enabled ? "On" : "Off"}</p>
            <p className="text-sm text-muted">{enabled ? "Your account is protected with MFA." : "Anyone with your password can sign in."}</p>
          </div>
          <Switch
            label="Two-step verification"
            checked={enabled && !confirming}
            onChange={(next) => {
              if (next) {
                adminAuth.setMfa(true);
                setConfirming(false);
                push("Two-step verification is on.");
              } else {
                setConfirming(true);
              }
            }}
          />
        </div>
        {confirming ? (
          <form noValidate onSubmit={turnOff} className="modal-in grid gap-3 rounded-[16px] p-4 ring-1 ring-warn/40">
            <Notice tone="warn">FindRx recommends MFA for every staff account. Confirm with your password to turn it off.</Notice>
            <PasswordField label="Current password" autoComplete="current-password" value={password} error={error} onChange={(event) => setPassword(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="text-bad ring-bad/40">
                Turn off
              </Button>
              <Button
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                  setError("");
                }}
              >
                Keep it on
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Panel>
  );
}

function GeneralTab({ account }: { account: AdminSession }) {
  const { push } = useToast();
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [errors, setErrors] = useState<FieldErrors<"name" | "phone">>({});
  const dirty = name !== account.name || phone !== account.phone;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: FieldErrors<"name" | "phone"> = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!isUsMobile(phone)) next.phone = "Enter a 10-digit US number.";
    setErrors(next);
    if (hasErrors(next)) return;
    adminAuth.updateProfile({ name, phone });
    push("Profile saved.");
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title="Your details">
        <form noValidate onSubmit={submit} className="grid gap-4">
          <AvatarUpload
            name={account.name}
            src={account.avatar}
            onChange={(avatar) => {
              adminAuth.updateAvatar(avatar);
              push(avatar ? "Profile photo updated." : "Profile photo removed.");
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" autoComplete="name" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
            <TextField
              label="Phone"
              type="tel"
              autoComplete="tel-national"
              value={phone}
              error={errors.phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <TextField label="Work email" value={account.email} disabled hint="Your email is your sign-in ID and can't be changed here." />
          <div>
            <Button type="submit" variant="primary" disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </form>
      </Panel>
      <div className="grid gap-4">
        <SecurityPanel account={account} />
        {/* The Owner holds every permission, so the list only matters for staff. */}
        {account.role === "owner" ? null : (
          <Panel title="Access" subtitle="Set by the Owner. Ask them to change it." delay={100}>
            <ul className="grid gap-2">
              {PERMISSIONS.map((permission) => {
                const granted = can(account, permission.id);
                return (
                  <li key={permission.id} className="flex items-center justify-between gap-3 text-md">
                    <span className={granted ? "text-ink" : "text-muted"}>{permission.label}</span>
                    <Badge tone={granted ? "good" : "muted"}>{granted ? "Allowed" : "No access"}</Badge>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}

export function AdminProfilePage() {
  const { tab } = useParams();
  const account = adminAuth.useAccount();
  if (!account) return null;
  if (tab !== undefined && tab !== "password") return <Navigate to={paths.admin.profile} replace />;
  const active = tab ?? "general";

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Profile" subtitle={`${account.role === "owner" ? "Owner" : "Staff"} · ${account.email}`} />
      <SegmentedTabs
        label="Profile sections"
        activeKey={active}
        items={[
          { key: "general", label: "General", to: paths.admin.profile },
          { key: "password", label: "Change password", to: paths.admin.profilePassword },
        ]}
      />
      {active === "general" ? (
        <GeneralTab key={account.id} account={account} />
      ) : (
        <ChangePasswordPanel onSubmit={adminAuth.changePassword} />
      )}
    </div>
  );
}
