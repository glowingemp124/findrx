import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type RadioCardsProps<T extends string> = {
  legend: string;
  value: T | null;
  options: Array<{ value: T; label: string; description?: ReactNode }>;
  onChange: (value: T) => void;
  hideLegend?: boolean;
};

/** A radio group drawn as selectable cards. */
export function RadioCards<T extends string>({ legend, value, options, onChange, hideLegend = false }: RadioCardsProps<T>) {
  const name = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-sm font-semibold text-ink-2"}>{legend}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-[14px] px-4 py-3 text-md ring-1 transition-colors duration-200",
              selected ? "bg-accent-soft ring-accent" : "ring-line-strong hover:bg-side-hover",
            )}
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 cursor-pointer accent-[var(--accent)]"
            />
            <span>
              <span className="block font-semibold">{option.label}</span>
              {option.description ? <span className="mt-0.5 block text-sm text-muted">{option.description}</span> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
