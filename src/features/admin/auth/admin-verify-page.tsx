import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { CopyableCode } from "@/components/ui/copy-button";
import { OtpInput } from "@/components/ui/otp-input";
import { AdminAuthLayout } from "@/features/admin/auth/admin-auth-layout";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { validateOtp } from "@/features/auth/validation";

/** Second sign-in step. MFA is required for every staff account. */
export function AdminVerifyPage() {
  const navigate = useNavigate();
  const challenge = adminAuth.useChallenge();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (!challenge) return <Navigate to={paths.admin.login} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = validateOtp(code);
    setError(message);
    if (message) return;
    const result = adminAuth.verifyMfa(code);
    if (!result.ok) setError(result.error);
    // On success AdminGuestOnly sends the person to their first module.
  };

  const back = () => {
    adminAuth.cancelMfa();
    navigate(paths.admin.login, { replace: true });
  };

  return (
    <AdminAuthLayout title="Enter your code" subtitle="6-digit code from your authenticator app. MFA is required for every staff account.">
      <form noValidate onSubmit={submit} className="grid gap-4">
        <OtpInput value={code} onChange={setCode} error={error} />
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
          Verify
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-[12px] bg-side-well px-3.5 py-2.5 text-sm text-muted">
          Authenticator is simulated for now. Your code:
          <CopyableCode code={challenge.code} className="bg-card" />
        </div>
        <button type="button" onClick={back} className="justify-self-start text-md font-semibold text-accent-text hover:underline">
          Back
        </button>
      </form>
    </AdminAuthLayout>
  );
}
