import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { PhoneField } from "@/features/client/components/phone-field";
import { PharmacyLocationMap } from "@/features/auth/components/pharmacy-location-map";
import { TextLink, textLinkClass } from "@/components/ui/text-link";
import { AuthLayout, FormError } from "@/features/auth/auth-layout";
import { joinRequests } from "@/features/auth/join-requests";
import type { PharmacyProfile } from "@/features/auth/types";
import { hasErrors, validatePharmacy, type FieldErrors } from "@/features/auth/validation";
import { DEFAULT_HOURS } from "@/lib/opening-hours";

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
const emptyAccount = { contactName: "", contactTitle: "", email: "", note: "", agreed: false };

type Step = "pharmacy" | "account" | "sent";

/** Two steps: the pharmacy, then a request to FindRx. No account is created. */
export function SignUpPage() {
  const [step, setStep] = useState<Step>("pharmacy");
  const [pharmacy, setPharmacy] = useState(emptyPharmacy);
  const [account, setAccount] = useState(emptyAccount);
  const [pharmacyErrors, setPharmacyErrors] = useState<FieldErrors<keyof PharmacyProfile>>({});
  const [accountErrors, setAccountErrors] = useState<Partial<Record<keyof typeof emptyAccount, string>>>({});
  const [formError, setFormError] = useState("");
  const [locationDetail, setLocationDetail] = useState("");

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
    const errors: Partial<Record<keyof typeof emptyAccount, string>> = {};
    if (account.contactName.trim().length < 2) errors.contactName = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim())) errors.email = "Enter a valid work email.";
    if (!account.agreed) errors.agreed = "Agree to the terms to send the request.";
    setAccountErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;
    const result = joinRequests.submit({
      pharmacy: { ...pharmacy, name: pharmacy.name.trim(), street: pharmacy.street.trim(), city: pharmacy.city.trim() },
      contactName: account.contactName.trim(),
      contactTitle: account.contactTitle.trim(),
      email: account.email.trim(),
      note: account.note.trim(),
    });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setStep("sent");
  };

  const signInLine = (
    <p className="text-center text-md text-muted">
      Already on FindRx? <TextLink to={paths.auth.signIn}>Sign in</TextLink>
    </p>
  );

  if (step === "pharmacy") {
    return (
      <AuthLayout eyebrow="Step 1 of 2" title="Join FindRx" subtitle="Pharmacy and location.">
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
            value={pharmacy.npi}
            error={pharmacyErrors.npi}
            onChange={(event) => editPharmacy({ npi: event.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <PhoneField
            id="pharmacy-phone"
            label="Pharmacy phone"
            value={pharmacy.phone}
            error={pharmacyErrors.phone}
            onChange={(phone) => editPharmacy({ phone })}
          />
          <PharmacyLocationMap
            detail={locationDetail}
            error={pharmacyErrors.street || pharmacyErrors.city || pharmacyErrors.state || pharmacyErrors.zip}
            onPick={(location) => {
              setLocationDetail(location.detail);
              editPharmacy({ street: location.street, city: location.city, state: location.state, zip: location.zip });
            }}
          />
          <Checkbox
            boxed
            checked={pharmacy.canCompound}
            onChange={(canCompound) => editPharmacy({ canCompound })}
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

  if (step === "sent") {
    return (
      <AuthLayout title="Request received" subtitle={pharmacy.name.trim()}>
        <div className="grid gap-4">
          <p className="text-md text-ink-2">FindRx will contact {account.email.trim()} before anyone can log in.</p>
          {signInLine}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="Step 2 of 2" title="Request to join" subtitle="Who should FindRx contact?">
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
            label="Title"
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
        <TextField label="Note" value={account.note} onChange={(event) => editAccount({ note: event.target.value })} />
        <Checkbox checked={account.agreed} onChange={(agreed) => editAccount({ agreed })} error={accountErrors.agreed}>
          I agree to the{" "}
          <Link to={paths.client.terms} target="_blank" className={textLinkClass}>
            Terms & Conditions
          </Link>
        </Checkbox>
        <FormError message={formError} />
        <div className="mt-1 grid gap-2.5 sm:grid-cols-[auto_1fr]">
          <Button size="lg" className="h-12" onClick={() => setStep("pharmacy")}>
            Back
          </Button>
          <Button type="submit" variant="primary" size="lg" className="h-12 text-lg">
            Send request
          </Button>
        </div>
        {signInLine}
      </form>
    </AuthLayout>
  );
}
