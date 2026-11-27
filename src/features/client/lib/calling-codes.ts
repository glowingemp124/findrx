export type CallingCode = {
  iso: string;
  name: string;
  dial: string;
  min: number;
  max: number;
};

/** United States is first and is the default. The list is the countries patients can text from. */
export const COUNTRIES: CallingCode[] = [
  { iso: "US", name: "United States", dial: "1", min: 10, max: 10 },
  { iso: "CA", name: "Canada", dial: "1", min: 10, max: 10 },
  { iso: "GB", name: "United Kingdom", dial: "44", min: 10, max: 10 },
  { iso: "MX", name: "Mexico", dial: "52", min: 10, max: 10 },
  { iso: "IN", name: "India", dial: "91", min: 10, max: 10 },
  { iso: "PK", name: "Pakistan", dial: "92", min: 10, max: 10 },
  { iso: "AE", name: "United Arab Emirates", dial: "971", min: 8, max: 9 },
  { iso: "SA", name: "Saudi Arabia", dial: "966", min: 9, max: 9 },
  { iso: "NG", name: "Nigeria", dial: "234", min: 10, max: 10 },
  { iso: "PH", name: "Philippines", dial: "63", min: 10, max: 10 },
  { iso: "DE", name: "Germany", dial: "49", min: 10, max: 11 },
  { iso: "FR", name: "France", dial: "33", min: 9, max: 9 },
  { iso: "AU", name: "Australia", dial: "61", min: 9, max: 9 },
  { iso: "BR", name: "Brazil", dial: "55", min: 10, max: 11 },
];

const digitsOf = (value: string) => value.replace(/\D/g, "");

/** Longest dial code that prefixes the number. US wins over Canada when both are +1. */
export function countryFor(value: string): CallingCode {
  const digits = digitsOf(value);
  if (!digits) return COUNTRIES[0];
  const ranked = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const match = ranked.find((country) => country.iso !== "CA" && digits.startsWith(country.dial) && digits.length > country.dial.length);
  return match ?? COUNTRIES[0];
}

export function nationalDigits(value: string, country = countryFor(value)) {
  const digits = digitsOf(value);
  if (digits.startsWith(country.dial) && digits.length > country.dial.length) return digits.slice(country.dial.length);
  return digits;
}

export function toCanonical(country: CallingCode, national: string) {
  const local = national.replace(/\D/g, "");
  return local ? `${country.dial}${local}` : "";
}

export function nationalError(value: string) {
  const country = countryFor(value);
  const local = nationalDigits(value, country);
  if (!local) return "Enter your mobile number.";
  if (local.length < country.min || local.length > country.max) {
    return country.min === country.max
      ? `Enter a ${country.min}-digit ${country.name} number.`
      : `Enter a ${country.name} number.`;
  }
  return "";
}
