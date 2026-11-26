import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { CopyableCode } from "@/components/ui/copy-button";
import { OtpInput } from "@/components/ui/otp-input";
import { TextLink } from "@/components/ui/text-link";
import { AuthLayout } from "@/features/auth/auth-layout";
import { authService } from "@/features/auth/auth-service";
import { validateOtp } from "@/features/auth/validation";

/** Shared by sign-up (confirms the email) and password reset. */
export function VerifyOtpPage() {
  const navigate = useNavigate();
  const challenge = authService.useChallenge();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  if (!challenge) return <Navigate to={paths.auth.signIn} replace />;
  if (challenge.purpose === "reset" && challenge.verified) return <Navigate to={paths.auth.resetPassword} replace />;

  const isSignUp = challenge.purpose === "signup";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = validateOtp(code);
    setError(message);
    if (message) return;
    const result = authService.verifyCode(code);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(isSignUp ? paths.pharmacy.home : paths.auth.resetPassword, { replace: true });
  };

  const resend = () => {
    authService.resendCode();
    setCode("");
    setError("");
    setResent(true);
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          {isSignUp ? "We sent a 6-digit code to " : "If an account exists for "}
          <span className="font-semibold text-ink-2">{challenge.email}</span>
          {isSignUp ? ". It expires in 10 minutes." : ", we've sent it a 6-digit code. It expires in 10 minutes."}
        </>
      }
    >
      <form noValidate onSubmit={submit} className="grid gap-4">
        <OtpInput value={code} onChange={setCode} error={error} />
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
          {isSignUp ? "Verify and continue" : "Verify"}
        </Button>
        <p className="text-center text-md text-muted">
          {resent ? "New code sent. " : "Didn't get it? "}
          <button type="button" onClick={resend} className="cursor-pointer font-semibold text-accent-text hover:underline">
            Send a new code
          </button>
        </p>
        {challenge.code ? (
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[12px] bg-side-well px-3.5 py-2.5 text-sm text-muted">
            Emails are simulated for now. Your code:
            <CopyableCode code={challenge.code} className="bg-card" />
          </div>
        ) : null}
        <p className="text-center text-md text-muted">
          <TextLink to={isSignUp ? paths.auth.signUp : paths.auth.signIn}>
            {isSignUp ? "Use a different email" : "Back to sign in"}
          </TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}
