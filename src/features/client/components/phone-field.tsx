import { useState } from "react";
import { COUNTRIES, countryFor, nationalDigits, nationalError, toCanonical } from "@/features/client/lib/calling-codes";

/** Regional-indicator flag for a two-letter country code. */
function flag(iso: string) {
  return [...iso.toUpperCase()].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}

/** Country code plus the national number. Defaults to the United States. */
export function PhoneField({
  label = "Mobile number",
  hint,
  error,
  value,
  onChange,
  id,
}: {
  label?: string;
  hint?: string;
  error?: string;
  /** Digits, with or without a leading country code. */
  value: string;
  onChange: (canonical: string) => void;
  id?: string;
}) {
  const [iso, setIso] = useState(() => countryFor(value).iso);
  const country = COUNTRIES.find((item) => item.iso === iso) ?? COUNTRIES[0];
  const national = nationalDigits(value, country);
  const fieldId = id ?? "phone";

  const write = (iso: string, digits: string) => {
    const next = COUNTRIES.find((item) => item.iso === iso) ?? COUNTRIES[0];
    onChange(toCanonical(next, digits));
  };

  return (
    <div className="grid gap-1.5 text-sm">
      <span id={`${fieldId}-label`} className="font-semibold text-ink-2">
        {label}
      </span>
      <div className={error ? "is-shake grid grid-cols-1 gap-2 min-[480px]:grid-cols-[13.5rem_minmax(0,1fr)]" : "grid grid-cols-1 gap-2 min-[480px]:grid-cols-[13.5rem_minmax(0,1fr)]"}>
        <select
          aria-label="Country code"
          value={iso}
          onChange={(event) => {
            setIso(event.target.value);
            write(event.target.value, national);
          }}
          className="h-10 rounded-full bg-card px-3 text-md text-ink shadow-raise ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-accent"
        >
          {COUNTRIES.map((item) => (
            <option key={item.iso} value={item.iso}>
              {flag(item.iso)} {item.name} +{item.dial}
            </option>
          ))}
        </select>
        <input
          id={fieldId}
          aria-labelledby={`${fieldId}-label`}
          aria-invalid={error ? true : undefined}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={country.iso === "US" ? "(713) 555-0123" : "Mobile number"}
          value={national}
          onChange={(event) => write(iso, event.target.value)}
          className="h-10 w-full rounded-full bg-card px-3.5 text-md text-ink shadow-raise ring-1 ring-line-strong outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
      </div>
      {error ? (
        <span role="alert" className="text-xs font-semibold text-bad">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

export { nationalError };
