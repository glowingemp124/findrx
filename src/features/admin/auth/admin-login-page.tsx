import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { DemoLogins } from "@/components/ui/demo-logins";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { AdminAuthLayout } from "@/features/admin/auth/admin-auth-layout";
import { adminAuth, DEMO_ADMIN_LOGINS } from "@/features/admin/auth/admin-auth-service";
import { FormError } from "@/features/auth/auth-layout";
import { hasErrors, validateSignIn, type FieldErrors } from "@/features/auth/validation";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [formError, setFormError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateSignIn({ email, password });
    setErrors(next);
    setFormError("");
    if (hasErrors(next)) return;
    const result = adminAuth.signIn(email, password);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    // Without MFA the session is open already and AdminGuestOnly moves on to the dashboard.
    if (result.mfa) navigate(paths.admin.verify);
  };

  return (
    <AdminAuthLayout title="Sign in" subtitle="For the FindRx team only.">
      <form noValidate onSubmit={submit} className="grid gap-4">
        <TextField
          label="Staff email"
          type="email"
          autoComplete="username"
          placeholder="you@findrx.com"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <FormError message={formError} />
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
          Continue
        </Button>
        <DemoLogins
          groups={DEMO_ADMIN_LOGINS}
          onPick={(login) => {
            setEmail(login.email);
            setPassword(login.password);
            setErrors({});
            setFormError("");
          }}
        />
      </form>
    </AdminAuthLayout>
  );
}
