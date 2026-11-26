import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  /** Base id; the label and message ids are derived from it. */
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** ARIA wiring for a control rendered inside `Field`. */
export function fieldAria(id: string, { label, hint, error }: { label?: string; hint?: string; error?: string }) {
  return {
    "aria-labelledby": label ? `${id}-label` : undefined,
    "aria-describedby": error || hint ? `${id}-message` : undefined,
    "aria-invalid": error ? true : undefined,
  } as const;
}

/**
 * Label, control and message. The label is linked to the control through `aria-labelledby`
 * rather than a wrapping <label>, so clicking the label text doesn't focus the field.
 */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("grid content-start gap-1.5 text-sm", className)}>
      {label ? (
        <span id={`${id}-label`} className="font-semibold text-ink-2">
          {label}
        </span>
      ) : null}
      {children}
      {error ? (
        <span id={`${id}-message`} role="alert" className="text-xs font-semibold text-bad">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-message`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export const control =
  "h-10 w-full rounded-full bg-card px-3.5 text-md text-ink shadow-raise ring-1 ring-line-strong outline-none transition-[box-shadow,background-color] placeholder:text-muted focus:ring-2 focus:ring-accent disabled:opacity-60";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  fieldClassName?: string;
};

export function TextField({
  label,
  hint,
  error,
  leading,
  trailing,
  className,
  fieldClassName,
  id,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} className={fieldClassName}>
      <span
        className={cn(
          "relative flex items-center",
          error && "is-shake",
        )}
      >
        {leading ? (
          <span className="pointer-events-none absolute left-3.5 text-muted">{leading}</span>
        ) : null}
        <input
          id={fieldId}
          {...fieldAria(fieldId, { label, hint, error })}
          className={cn(control, leading && "pl-10", trailing && "pr-16", className)}
          {...props}
        />
        {trailing ? <span className="absolute right-3 text-muted">{trailing}</span> : null}
      </span>
    </Field>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
};

export function SelectField({
  label,
  hint,
  error,
  className,
  fieldClassName,
  children,
  id,
  ...props
}: SelectFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} className={fieldClassName}>
      <select
        id={fieldId}
        {...fieldAria(fieldId, { label, hint, error })}
        className={cn(control, "appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9", error && "is-shake", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%2355606b' stroke-width='1.5' stroke-linecap='round' d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
