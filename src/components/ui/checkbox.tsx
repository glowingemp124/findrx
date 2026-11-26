import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

type CheckboxControlProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Required when there's no visible label next to it (e.g. in a table cell). */
  ariaLabel?: string;
  title?: string;
};

/** The box on its own: a real checkbox input, drawn with tokens and an animated check. */
export function CheckboxControl({ checked, onChange, disabled = false, invalid = false, ariaLabel, title }: CheckboxControlProps) {
  return (
    <span className="relative inline-grid size-5 shrink-0 place-items-center" title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.checked)}
        className={cn(
          "peer size-5 cursor-pointer appearance-none rounded-[6px] bg-card ring-[1.5px] ring-line-strong transition-[background-color,box-shadow] duration-200",
          "hover:ring-ink-2/50 checked:bg-accent checked:ring-accent",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-default disabled:opacity-55 disabled:hover:ring-line-strong",
          invalid && "ring-bad",
        )}
      />
      <Icon
        name="check"
        className="pointer-events-none absolute size-3.5 scale-50 text-accent-ink opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] peer-checked:scale-100 peer-checked:opacity-100"
      />
    </span>
  );
}

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  description?: ReactNode;
  error?: string;
  /** Draws the row as a bordered box. */
  boxed?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Checkbox row. Clicking the text toggles it, which is expected for checkboxes. */
export function Checkbox({ checked, onChange, children, description, error, boxed = false, disabled = false, className }: CheckboxProps) {
  return (
    <div className={className}>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3",
          disabled && "cursor-default",
          boxed && "rounded-[16px] bg-side-well p-4 ring-1 ring-line-strong transition-colors",
          boxed && checked && "bg-accent-soft ring-accent/50",
          boxed && error && "ring-bad",
        )}
      >
        <span className="mt-px">
          <CheckboxControl checked={checked} onChange={onChange} disabled={disabled} invalid={Boolean(error)} />
        </span>
        <span className="text-md">
          <span className="block text-ink-2">{children}</span>
          {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
        </span>
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
