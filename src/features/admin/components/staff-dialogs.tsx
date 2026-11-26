import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { PasswordField } from "@/components/ui/password-field";
import { Switch } from "@/components/ui/switch";
import { adminAuth } from "@/features/admin/auth/admin-auth-service";
import { PERMISSIONS, type AdminSession, type Permission } from "@/features/admin/types";
import { isUsMobile } from "@/features/client/lib/validate-draft";
import { hasErrors, isEmail, passwordError, type FieldErrors } from "@/features/auth/validation";
import { useToast } from "@/lib/toast";

type StaffFields = "name" | "email" | "phone" | "password";

function validateStaff(values: { name: string; email: string; phone: string; password: string }, passwordRequired: boolean) {
  const errors: FieldErrors<StaffFields> = {};
  if (values.name.trim().length < 2) errors.name = "Enter their full name.";
  if (!values.email.trim()) errors.email = "Enter their work email.";
  else if (!isEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!values.phone.trim()) errors.phone = "Enter their phone number.";
  else if (!isUsMobile(values.phone)) errors.phone = "Enter a 10-digit US number.";
  if (passwordRequired || values.password) {
    const message = passwordError(values.password);
    if (message) errors.password = message;
  }
  return errors;
}

function PermissionChecklist({ value, onChange }: { value: Permission[]; onChange: (value: Permission[]) => void }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-2 text-sm font-semibold text-ink-2">Permissions</legend>
      {PERMISSIONS.map((permission) => (
        <Checkbox
          key={permission.id}
          checked={value.includes(permission.id)}
          onChange={(checked) => onChange(checked ? [...value, permission.id] : value.filter((item) => item !== permission.id))}
          description={permission.description}
        >
          <span className="font-semibold text-ink">{permission.label}</span>
        </Checkbox>
      ))}
    </fieldset>
  );
}

const empty = { name: "", email: "", phone: "", password: "", permissions: [] as Permission[] };

/** Owner creates a staff account directly: they can sign in with these details right away. */
export function CreateStaffDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useToast();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors<StaffFields>>({});
  const [formError, setFormError] = useState("");
  const edit = (changes: Partial<typeof empty>) => setValues((current) => ({ ...current, ...changes }));

  const close = () => {
    setValues(empty);
    setErrors({});
    setFormError("");
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateStaff(values, true);
    setErrors(next);
    setFormError("");
    if (hasErrors(next)) return;
    const result = adminAuth.createStaff(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    push(`${values.name.trim()} can now sign in.`);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Add staff member" description="They sign in at /admin/login with this email and password, then MFA.">
      <form noValidate onSubmit={submit} className="grid gap-4 pb-5">
        <TextField label="Full name" autoComplete="off" value={values.name} error={errors.name} onChange={(event) => edit({ name: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Work email" type="email" autoComplete="off" value={values.email} error={errors.email} onChange={(event) => edit({ email: event.target.value })} />
          <TextField label="Phone" type="tel" autoComplete="off" value={values.phone} error={errors.phone} onChange={(event) => edit({ phone: event.target.value })} />
        </div>
        <PasswordField
          label="Temporary password"
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number. Share it securely; they can change it in Profile."
          value={values.password}
          error={errors.password}
          onChange={(event) => edit({ password: event.target.value })}
        />
        <PermissionChecklist value={values.permissions} onChange={(permissions) => edit({ permissions })} />
        {formError ? <Notice tone="bad">{formError}</Notice> : null}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" variant="primary" size="lg">
            Create staff member
          </Button>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Owner edits a staff member. Email is the sign-in identity, so it stays read-only. */
export function EditStaffDialog({ member, onClose }: { member: AdminSession | null; onClose: () => void }) {
  return member ? <EditStaffForm key={member.id} member={member} onClose={onClose} /> : <Modal open={false} title="" onClose={onClose} />;
}

function EditStaffForm({ member, onClose }: { member: AdminSession; onClose: () => void }) {
  const { push } = useToast();
  const [values, setValues] = useState({ name: member.name, email: member.email, phone: member.phone, password: "", active: member.active });
  const [errors, setErrors] = useState<FieldErrors<StaffFields>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const edit = (changes: Partial<typeof values>) => setValues((current) => ({ ...current, ...changes }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateStaff(values, false);
    setErrors(next);
    if (hasErrors(next)) return;
    adminAuth.updateStaff(member.id, values);
    push(`${values.name.trim()} updated.`);
    onClose();
  };

  const remove = () => {
    adminAuth.removeStaff(member.id);
    push(`${member.name} removed from the team.`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Edit ${member.name}`} description={member.email}>
      <form noValidate onSubmit={submit} className="grid gap-4 pb-5">
        <TextField label="Full name" value={values.name} error={errors.name} onChange={(event) => edit({ name: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Work email" value={values.email} disabled hint="Email is the sign-in ID and can't change." />
          <TextField label="Phone" type="tel" value={values.phone} error={errors.phone} onChange={(event) => edit({ phone: event.target.value })} />
        </div>
        <PasswordField
          label="New password (optional)"
          autoComplete="new-password"
          hint="Leave blank to keep their current password."
          value={values.password}
          error={errors.password}
          onChange={(event) => edit({ password: event.target.value })}
        />
        <div className="flex items-center justify-between gap-4 rounded-[16px] bg-side-well p-4">
          <div>
            <p className="font-semibold">{values.active ? "Active" : "Deactivated"}</p>
            <p className="text-sm text-muted">Deactivated staff can't sign in. Their history is kept.</p>
          </div>
          <Switch label="Account active" checked={values.active} onChange={(active) => edit({ active })} />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" variant="primary" size="lg">
            Save changes
          </Button>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          {confirmRemove ? (
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Remove for good?</span>
              <Button size="lg" className="text-bad ring-bad/40" onClick={remove}>
                Yes, remove
              </Button>
            </span>
          ) : (
            <Button variant="ghost" size="lg" className="ml-auto text-bad" onClick={() => setConfirmRemove(true)}>
              Remove
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
