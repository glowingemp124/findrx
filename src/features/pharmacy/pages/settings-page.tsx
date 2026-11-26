import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { ChangePasswordPanel } from "@/components/layout/change-password-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { authService } from "@/features/auth/auth-service";
import type { PharmacyProfile } from "@/features/auth/types";
import { hasErrors, validatePharmacy, type FieldErrors } from "@/features/auth/validation";
import { OpeningHoursEditor } from "@/features/pharmacy/components/opening-hours-editor";
import { PageHeader } from "@/features/pharmacy/components/page-header";
import { usePharmacyWorkspace } from "@/features/pharmacy/hooks/pharmacy-workspace";
import { useToast } from "@/lib/toast";
import { invalidDays } from "@/lib/opening-hours";
import { US_STATE_OPTIONS } from "@/lib/us-states";

function Section({ title, description, children, delay = 0 }: { title: string; description: string; children: ReactNode; delay?: number }) {
  return (
    <section className="card rise-in grid gap-5 p-5 sm:p-6 md:grid-cols-[240px_1fr] md:gap-8" style={{ animationDelay: `${delay}ms` }}>
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-md text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function RequestsSection() {
  const { account } = usePharmacyWorkspace();
  const { push } = useToast();
  return (
    <Section title="Requests" description="Pause when you're closed or short-staffed. Patients won't be affected.">
      <div className="flex items-center justify-between gap-4 rounded-[16px] bg-side-well p-4">
        <div>
          <p className="font-semibold">{account.acceptingRequests ? "Accepting requests" : "Paused"}</p>
          <p className="text-sm text-muted">
            {account.acceptingRequests ? "You can see and claim new requests." : "You can still see requests but can't claim them."}
          </p>
        </div>
        <Switch
          label="Accepting requests"
          checked={account.acceptingRequests}
          onChange={(accepting) => {
            authService.setAcceptingRequests(accepting);
            push(accepting ? "You're accepting requests again." : "New requests paused.", { tone: accepting ? "success" : "warn" });
          }}
        />
      </div>
    </Section>
  );
}

function PharmacySection() {
  const { account } = usePharmacyWorkspace();
  const { push } = useToast();
  const [form, setForm] = useState<PharmacyProfile>(account.pharmacy);
  const [errors, setErrors] = useState<FieldErrors<keyof PharmacyProfile>>({});
  const edit = (changes: Partial<PharmacyProfile>) => setForm((current) => ({ ...current, ...changes }));
  // Hours have their own section and save button.
  const dirty = JSON.stringify({ ...form, hours: null }) !== JSON.stringify({ ...account.pharmacy, hours: null });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validatePharmacy(form);
    setErrors(next);
    if (hasErrors(next)) return;
    authService.updatePharmacy({
      ...form,
      hours: account.pharmacy.hours,
      name: form.name.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
    });
    push("Pharmacy details saved.");
  };

  return (
    <Section title="Pharmacy" description="Shown to patients after they pay, so they can call and find you." delay={60}>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Pharmacy name" value={form.name} error={errors.name} onChange={(event) => edit({ name: event.target.value })} />
          <TextField label="Phone" type="tel" value={form.phone} error={errors.phone} onChange={(event) => edit({ phone: event.target.value })} />
        </div>
        <TextField label="NPI number" value={form.npi} disabled hint="Verified by FindRx. Contact support to change it." />
        <TextField label="Street address" value={form.street} error={errors.street} onChange={(event) => edit({ street: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-[1fr_170px_120px]">
          <TextField label="City" value={form.city} error={errors.city} onChange={(event) => edit({ city: event.target.value })} />
          <Select label="State" value={form.state || null} options={US_STATE_OPTIONS} error={errors.state} onChange={(state) => edit({ state })} />
          <TextField
            label="ZIP"
            inputMode="numeric"
            value={form.zip}
            error={errors.zip}
            onChange={(event) => edit({ zip: event.target.value.replace(/\D/g, "").slice(0, 5) })}
          />
        </div>
        <Checkbox
          checked={form.canCompound}
          onChange={(canCompound) => edit({ canCompound })}
          description="Turn on to also see requests that need compounding."
        >
          <span className="font-semibold text-ink">We compound medications</span>
        </Checkbox>
        <div className="flex gap-2.5">
          <Button type="submit" variant="primary" disabled={!dirty}>
            Save changes
          </Button>
          {dirty ? (
            <Button
              onClick={() => {
                setForm(account.pharmacy);
                setErrors({});
              }}
            >
              Discard
            </Button>
          ) : null}
        </div>
      </form>
    </Section>
  );
}

function HoursSection() {
  const { account } = usePharmacyWorkspace();
  const { push } = useToast();
  const [hours, setHours] = useState(account.pharmacy.hours);
  const [showErrors, setShowErrors] = useState(false);
  const invalid = invalidDays(hours);
  const dirty = JSON.stringify(hours) !== JSON.stringify(account.pharmacy.hours);

  const save = () => {
    setShowErrors(true);
    if (invalid.length > 0) return;
    authService.updatePharmacy({ ...account.pharmacy, hours });
    push("Opening hours saved.");
  };

  return (
    <Section title="Opening hours" description="Shown to patients with your address, so they know when to call or visit." delay={180}>
      <div className="grid gap-4">
        <OpeningHoursEditor value={hours} onChange={setHours} invalid={showErrors ? invalid : []} />
        <div className="flex gap-2.5">
          <Button variant="primary" disabled={!dirty} onClick={save}>
            Save hours
          </Button>
          {dirty ? (
            <Button
              onClick={() => {
                setHours(account.pharmacy.hours);
                setShowErrors(false);
              }}
            >
              Discard
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function ContactSection() {
  const { account } = usePharmacyWorkspace();
  const { push } = useToast();
  const [name, setName] = useState(account.contactName);
  const [title, setTitle] = useState(account.contactTitle);
  const [error, setError] = useState("");
  const dirty = name !== account.contactName || title !== account.contactTitle;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    setError("");
    authService.updateContact({ contactName: name.trim(), contactTitle: title.trim() });
    push("Your details saved.");
  };

  return (
    <Section title="Your details" description="Your photo and name, as your team sees them in FindRx." delay={120}>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <AvatarUpload
          name={account.contactName}
          src={account.avatar}
          onChange={(avatar) => {
            authService.updateAvatar(avatar);
            push(avatar ? "Profile photo updated." : "Profile photo removed.");
          }}
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <TextField label="Your name" value={name} error={error} onChange={(event) => setName(event.target.value)} />
          <TextField label="Title (optional)" placeholder="PharmD" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <TextField label="Work email" value={account.email} disabled hint="Contact FindRx support to change your sign-in email." />
        <div>
          <Button type="submit" variant="primary" disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Section>
  );
}

const TABS = [
  { key: "general", label: "General", to: paths.pharmacy.settings },
  { key: "password", label: "Change password", to: paths.pharmacy.settingsPassword },
];

export function SettingsPage() {
  const { tab } = useParams();
  if (tab !== undefined && tab !== "password") return <Navigate to={paths.pharmacy.settings} replace />;
  const active = tab ?? "general";

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" subtitle="Your pharmacy, your account and whether you're taking requests." />
      <SegmentedTabs label="Settings sections" items={TABS} activeKey={active} />
      {active === "general" ? (
        <>
          <RequestsSection />
          <PharmacySection />
          <ContactSection />
          <HoursSection />
        </>
      ) : (
        <ChangePasswordPanel onSubmit={authService.changePassword} />
      )}
    </div>
  );
}
