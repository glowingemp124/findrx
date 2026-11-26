import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { Select } from "@/components/ui/select";
import { TextLink, textLinkClass } from "@/components/ui/text-link";
import { AuthLayout, FormError } from "@/features/auth/auth-layout";
import { authService } from "@/features/auth/auth-service";
import type { PharmacyProfile } from "@/features/auth/types";
import { hasErrors, validateAccount, validatePharmacy, type FieldErrors } from "@/features/auth/validation";
import { DEFAULT_HOURS } from "@/lib/opening-hours";
import { US_STATE_OPTIONS } from "@/lib/us-states";

const emptyPharmacy: PharmacyProfile = {
  name: "",
  npi: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  canCompound: false,
  hours: DEFAULT_HOURS,
};
const emptyAccount = { contactName: "", contactTitle: "", email: "", password: "", confirm: "", agreed: false };

type Step = "pharmacy" | "account";

/** Two steps: the pharmacy (what patients see after paying), then the person signing up. */
export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("pharmacy");
  const [pharmacy, setPharmacy] = useState(emptyPharmacy);
  const [account, setAccount] = useState(emptyAccount);
  const [pharmacyErrors, setPharmacyErrors] = useState<FieldErrors<keyof PharmacyProfile>>({});
  const [accountErrors, setAccountErrors] = useState<FieldErrors<keyof typeof emptyAccount>>({});
  const [formError, setFormError] = useState("");

  const editPharmacy = (changes: Partial<PharmacyProfile>) => setPharmacy((current) => ({ ...current, ...changes }));
  const editAccount = (changes: Partial<typeof emptyAccount>) => setAccount((current) => ({ ...current, ...changes }));

  const submitPharmacy = (event: FormEvent) => {
    event.preventDefault();
    const errors = validatePharmacy(pharmacy);
    setPharmacyErrors(errors);
    if (!hasErrors(errors)) setStep("account");
  };

  const submitAccount = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateAccount(account);
    setAccountErrors(errors);
    setFormError("");
    if (hasErrors(errors)) return;
    const result = authService.beginSignUp({
      email: account.email,
      password: account.password,
      contactName: account.contactName.trim(),
      contactTitle: account.contactTitle.trim(),
      pharmacy: { ...pharmacy, name: pharmacy.name.trim(), street: pharmacy.street.trim(), city: pharmacy.city.trim() },
    });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    navigate(paths.auth.verifyOtp);
  };

  const signInLine = (
    <p className="text-center text-md text-muted">
      Already on FindRx? <TextLink to={paths.auth.signIn}>Sign in</TextLink>
    </p>
  );

  if (step === "pharmacy") {
    return (
      <AuthLayout eyebrow="Step 1 of 2" title="Join FindRx" subtitle="Free for pharmacies. Start with where you are.">
        <form noValidate onSubmit={submitPharmacy} className="grid gap-4">
          <TextField
            label="Pharmacy name"
            autoComplete="organization"
            placeholder="Riverbend Pharmacy"
            value={pharmacy.name}
            error={pharmacyErrors.name}
            onChange={(event) => editPharmacy({ name: event.target.value })}
          />
          <TextField
            label="NPI number"
            inputMode="numeric"
            placeholder="10 digits"
            hint="FindRx checks it against the NPI registry before you go live."
            value={pharmacy.npi}
            error={pharmacyErrors.npi}
            onChange={(event) => editPharmacy({ npi: event.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <TextField
            label="Pharmacy phone"
            type="tel"
            autoComplete="tel-national"
            placeholder="(713) 555-0186"
            hint="Patients call this number after they pay."
            value={pharmacy.phone}
            error={pharmacyErrors.phone}
            onChange={(event) => editPharmacy({ phone: event.target.value })}
          />
          <TextField
            label="Street address"
            autoComplete="address-line1"
            placeholder="1420 Washington Ave"
            value={pharmacy.street}
            error={pharmacyErrors.street}
            onChange={(event) => editPharmacy({ street: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_150px_110px]">
            <TextField
              label="City"
              autoComplete="address-level2"
              placeholder="Houston"
              value={pharmacy.city}
              error={pharmacyErrors.city}
              onChange={(event) => editPharmacy({ city: event.target.value })}
            />
            <Select
              label="State"
              value={pharmacy.state || null}
              options={US_STATE_OPTIONS}
              error={pharmacyErrors.state}
              onChange={(state) => editPharmacy({ state })}
            />
            <TextField
              label="ZIP"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="77007"
              value={pharmacy.zip}
              error={pharmacyErrors.zip}
              onChange={(event) => editPharmacy({ zip: event.target.value.replace(/\D/g, "").slice(0, 5) })}
            />
          </div>
          <Checkbox
            boxed
            checked={pharmacy.canCompound}
            onChange={(canCompound) => editPharmacy({ canCompound })}
            description="You'll also see requests that need compounding."
          >
            <span className="font-semibold text-ink">We compound medications</span>
          </Checkbox>
          <Button type="submit" variant="primary" size="lg" className="mt-1 h-12 w-full text-lg">
            Continue
          </Button>
          {signInLine}
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="Step 2 of 2" title="Your account" subtitle={`You'll sign in to ${pharmacy.name.trim()} with this.`}>
      <form noValidate onSubmit={submitAccount} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
          <TextField
            label="Your name"
            autoComplete="name"
            placeholder="Ava Chen"
            value={account.contactName}
            error={accountErrors.contactName}
            onChange={(event) => editAccount({ contactName: event.target.value })}
          />
          <TextField
            label="Title (optional)"
            placeholder="PharmD"
            value={account.contactTitle}
            onChange={(event) => editAccount({ contactTitle: event.target.value })}
          />
        </div>
        <TextField
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@pharmacy.com"
          value={account.email}
          error={accountErrors.email}
          onChange={(event) => editAccount({ email: event.target.value })}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use a letter and a number."
          value={account.password}
          error={accountErrors.password}
          onChange={(event) => editAccount({ password: event.target.value })}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={account.confirm}
          error={accountErrors.confirm}
          onChange={(event) => editAccount({ confirm: event.target.value })}
        />
        <Checkbox checked={account.agreed} onChange={(agreed) => editAccount({ agreed })} error={accountErrors.agreed}>
          I agree to the{" "}
          <Link to={paths.client.terms} target="_blank" className={textLinkClass}>
            Terms of Service
          </Link>{" "}
          and will only claim requests we can fill.
        </Checkbox>
        <FormError message={formError} />
        <div className="mt-1 grid gap-2.5 sm:grid-cols-[auto_1fr]">
          <Button size="lg" className="h-12" onClick={() => setStep("pharmacy")}>
            Back
          </Button>
          <Button type="submit" variant="primary" size="lg" className="h-12 text-lg">
            Create account
          </Button>
        </div>
        {signInLine}
      </form>
    </AuthLayout>
  );
}
