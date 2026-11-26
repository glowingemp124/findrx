import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/text-link";
import { AuthLayout } from "@/features/auth/auth-layout";
import { authService } from "@/features/auth/auth-service";
import { hasErrors, validateEmail, type FieldErrors } from "@/features/auth/validation";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email">>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateEmail(email);
    setErrors(next);
    if (hasErrors(next)) return;
    authService.beginReset(email);
    navigate(paths.auth.verifyOtp);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your work email and we'll send you a 6-digit code.">
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
        <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
          Send code
        </Button>
        <p className="text-center text-md text-muted">
          Remembered it? <TextLink to={paths.auth.signIn}>Sign in</TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}
