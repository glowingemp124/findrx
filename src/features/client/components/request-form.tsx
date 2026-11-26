import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { hasDraftErrors, validateDraft, type DraftErrors } from "@/features/client/lib/validate-draft";
import { draftStore } from "@/features/client/services/draft-store";
import { platformSettings } from "@/features/platform/platform-settings";
import { formLabel, genericLabel } from "@/features/requests/lib/formatters";
import {
  GENERIC_PREFERENCES,
  MEDICATION_FORMS,
  type Fulfilment,
  type RequestDraft,
} from "@/features/requests/types";
import { cn } from "@/lib/cn";
import { useState, type FormEvent, type ReactNode } from "react";

const FORM_OPTIONS = MEDICATION_FORMS.map((value) => ({ value, label: formLabel(value) }));
const GENERIC_OPTIONS = GENERIC_PREFERENCES.map((value) => ({ value, label: genericLabel(value) }));

const FULFILMENT_OPTIONS: Array<{ value: Fulfilment; icon: IconName; label: string; note?: string }> = [
  { value: "pickup", icon: "mapPin", label: "Willing to pick up anywhere in my radius" },
  { value: "delivery", icon: "truck", label: "Need it delivered", note: "(you agree delivery with the pharmacy)" },
];

function Divider() {
  return <hr className="border-line" />;
}

function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/** The Blind Request form. Submits a validated draft; the parent handles phone verification. */
export function RequestForm({ onSubmit }: { onSubmit: (draft: RequestDraft) => void }) {
  const draft = draftStore.use();
  const { searchRadii } = platformSettings.use();
  const radiusOptions = searchRadii.map((value) => ({ value, label: `${value} miles` }));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [attempted, setAttempted] = useState(false);

  const update = (changes: Partial<RequestDraft>) => {
    draftStore.patch(changes);
    // Once the client has tried to submit, keep errors in step with what they type.
    if (attempted) setErrors(validateDraft({ ...draft, ...changes }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateDraft(draft);
    setAttempted(true);
    setErrors(next);
    if (hasDraftErrors(next)) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    onSubmit(draft);
  };

  return (
    <form noValidate onSubmit={submit} aria-labelledby="request-title" className="card grid gap-4 p-5 sm:gap-5 sm:p-7">
      <header>
        <h2 id="request-title" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          <Icon name="send" className="size-6 text-accent" />
          Your Blind Request
        </h2>
        <p className="mt-1 text-md text-muted">Fill this in, or chat on the left. Both fill the same request.</p>
      </header>

      <Row>
        <TextField
          label="Medication"
          placeholder="e.g. Metformin"
          value={draft.medication}
          error={errors.medication}
          onChange={(event) => update({ medication: event.target.value })}
        />
        <TextField
          label="Dose (optional)"
          placeholder="500 mg"
          value={draft.dose}
          onChange={(event) => update({ dose: event.target.value })}
        />
      </Row>
      <Row>
        <Select
          label="Form"
          value={draft.form || null}
          options={FORM_OPTIONS}
          error={errors.form}
          onChange={(form) => update({ form })}
        />
        <TextField
          label="Quantity"
          placeholder="60"
          inputMode="numeric"
          value={draft.quantity}
          error={errors.quantity}
          onChange={(event) => update({ quantity: event.target.value.replace(/\D/g, "").slice(0, 4) })}
        />
      </Row>
      <Row>
        <Select
          label="Generic OK?"
          value={draft.genericPreference}
          options={GENERIC_OPTIONS}
          onChange={(genericPreference) => update({ genericPreference })}
        />
        <TextField
          label="Manufacturer (optional)"
          placeholder="No preference"
          value={draft.manufacturer}
          onChange={(event) => update({ manufacturer: event.target.value })}
        />
      </Row>

      <Checkbox
        checked={draft.needsCompounding}
        onChange={(needsCompounding) => update({ needsCompounding })}
        description="Only pharmacies that compound will see it."
      >
        <span className="font-semibold text-ink">Needs compounding</span>
      </Checkbox>

      <Divider />

      <Row>
        <TextField
          label="Your area (ZIP or city)"
          placeholder="e.g. 77002 or Houston"
          autoComplete="postal-code"
          leading={<Icon name="mapPin" className="size-4" />}
          value={draft.area}
          error={errors.area}
          onChange={(event) => update({ area: event.target.value })}
        />
        <Select
          label="Search within"
          value={draft.radiusMiles}
          options={radiusOptions}
          onChange={(radiusMiles) => update({ radiusMiles })}
        />
      </Row>

      <fieldset className="grid gap-2.5">
        <legend className="mb-2.5 text-sm font-semibold text-ink-2">How do you want to get it?</legend>
        {FULFILMENT_OPTIONS.map((option) => {
          const selected = draft.fulfilment === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3.5 text-md ring-1 transition-colors",
                selected ? "bg-accent-soft ring-accent" : "ring-line-strong hover:bg-side-hover",
              )}
            >
              <input
                type="radio"
                name="fulfilment"
                value={option.value}
                checked={selected}
                onChange={() => update({ fulfilment: option.value })}
                className="size-4 cursor-pointer accent-[var(--accent)]"
              />
              <Icon name={option.icon} className="size-4 text-ink-2" />
              <span>
                {option.label}
                {option.note ? <span className="ml-1.5 text-sm text-muted">{option.note}</span> : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      <Divider />

      <Row>
        <TextField
          label="Your full name"
          placeholder="Enter your full name"
          autoComplete="name"
          value={draft.fullName}
          error={errors.fullName}
          onChange={(event) => update({ fullName: event.target.value })}
        />
        <TextField
          label="Mobile number"
          placeholder="(713) 555-0123"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={draft.phone}
          error={errors.phone}
          onChange={(event) => update({ phone: event.target.value })}
        />
      </Row>

      <p className="flex gap-2.5 rounded-[14px] bg-accent-soft px-4 py-3 text-md text-accent-text">
        <Icon name="lock" className="mt-0.5 size-4" />
        Pharmacies see only the medication, your preferences and a rough distance. Your name and number are shared only with
        the pharmacy you pay.
      </p>

      <Button type="submit" variant="primary" size="lg" className="h-12 w-full text-lg">
        Post Blind Request
      </Button>
    </form>
  );
}
