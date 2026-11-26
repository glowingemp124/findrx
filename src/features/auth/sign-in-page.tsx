import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DemoLogins } from "@/components/ui/demo-logins";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { TextLink } from "@/components/ui/text-link";
import { AuthLayout, FormError } from "@/features/auth/auth-layout";
import { authService } from "@/features/auth/auth-service";
import { DEMO_PHARMACY_LOGINS } from "@/features/auth/seed-pharmacies";
import { hasErrors, validateSignIn, type FieldErrors } from "@/features/auth/validation";

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? paths.pharmacy.home;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [formError, setFormError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateSignIn({ email, password });
    setErrors(next);
    setFormError("");
    if (hasErrors(next)) return;
    const result = authService.signIn(email, password, remember);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <AuthLayout title="Sign in" subtitle="Pharmacy portal">
      <form noValidate onSubmit={submit} className="grid gap-4">
        <TextField
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@pharmacy.com"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox checked={remember} onChange={setRemember}>
            Keep me signed in on this device
          </Checkbox>
          <TextLink to={paths.auth.forgotPassword} className="text-md">
            Forgot password?
          </TextLink>
        </div>
        <FormError message={formError} />
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
          Continue
        </Button>
        <p className="text-center text-md text-muted">
          New to FindRx? <TextLink to={paths.auth.signUp}>Join free</TextLink>
        </p>
        <p className="text-center text-sm text-muted">5 failed attempts lock the account for 15 minutes.</p>
        <DemoLogins
          groups={DEMO_PHARMACY_LOGINS}
          onPick={(login) => {
            setEmail(login.email);
            setPassword(login.password);
            setErrors({});
            setFormError("");
          }}
        />
      </form>
    </AuthLayout>
  );
}
