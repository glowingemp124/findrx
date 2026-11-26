import { useId, type TextareaHTMLAttributes } from "react";
import { Field, fieldAria } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string };

export function Textarea({ label, hint, error, className, id, rows = 4, ...props }: TextareaProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        rows={rows}
        {...fieldAria(fieldId, { label, hint, error })}
        className={cn(
          "w-full resize-y rounded-[16px] bg-card px-3.5 py-2.5 text-md text-ink shadow-raise ring-1 ring-line-strong outline-none placeholder:text-muted focus:ring-2 focus:ring-accent",
          error && "is-shake",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
