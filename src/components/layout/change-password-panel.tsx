import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { PasswordField } from "@/components/ui/password-field";
import { hasErrors, validatePasswordChange, type FieldErrors } from "@/features/auth/validation";
import { useToast } from "@/lib/toast";

type Result = { ok: true } | { ok: false; error: string };

const empty = { current: "", next: "", confirm: "" };

/** Current / new / confirm password card, shared by the pharmacy and admin sides. */
export function ChangePasswordPanel({ onSubmit }: { onSubmit: (current: string, next: string) => Result }) {
  const { push } = useToast();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors<keyof typeof empty>>({});
  const [formError, setFormError] = useState("");
  const edit = (changes: Partial<typeof empty>) => setValues((current) => ({ ...current, ...changes }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validatePasswordChange(values);
    setErrors(next);
    setFormError("");
    if (hasErrors(next)) return;
    const result = onSubmit(values.current, values.next);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setValues(empty);
    push("Password changed.");
  };

  return (
    <Panel title="Change password" subtitle="At least 8 characters, with a letter and a number." className="max-w-[640px]">
      <form noValidate onSubmit={submit} className="grid gap-4">
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          value={values.current}
          error={errors.current}
          onChange={(event) => edit({ current: event.target.value })}
        />
        <PasswordField label="New password" autoComplete="new-password" value={values.next} error={errors.next} onChange={(event) => edit({ next: event.target.value })} />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={values.confirm}
          error={errors.confirm}
          onChange={(event) => edit({ confirm: event.target.value })}
        />
        {formError ? <Notice tone="bad">{formError}</Notice> : null}
        <div>
          <Button type="submit" variant="primary">
            Change password
          </Button>
        </div>
      </form>
    </Panel>
  );
}
