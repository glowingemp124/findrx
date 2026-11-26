import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { AuthLayout, FormError } from "@/features/auth/auth-layout";
import { authService } from "@/features/auth/auth-service";
import { hasErrors, validateNewPassword, type FieldErrors } from "@/features/auth/validation";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const challenge = authService.useChallenge();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"password" | "confirm">>({});
  const [formError, setFormError] = useState("");

  if (!challenge?.verified || challenge.purpose !== "reset") return <Navigate to={paths.auth.forgotPassword} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateNewPassword({ password, confirm });
    setErrors(next);
    if (hasErrors(next)) return;
    const result = authService.resetPassword(password);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    navigate(paths.pharmacy.home, { replace: true });
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="You'll be signed in once it's saved.">
      <form noValidate onSubmit={submit} className="grid gap-4">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use a letter and a number."
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          error={errors.confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <FormError message={formError} />
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
          Save and sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
