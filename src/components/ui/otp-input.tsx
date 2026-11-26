import { useRef } from "react";
import { cn } from "@/lib/cn";

export function OtpInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  const write = (next: string) => {
    onChange(next.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <div>
      <div className="flex justify-between gap-1.5 sm:gap-2" role="group" aria-label="6-digit code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            value={digit}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1}`}
            maxLength={1}
            className={cn(
              "h-11 w-full max-w-[52px] min-w-0 rounded-[12px] bg-canvas text-center text-lg font-semibold text-ink tabular-nums ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-accent",
              error && "ring-bad",
            )}
            onChange={(event) => {
              const char = event.target.value.replace(/\D/g, "").slice(-1);
              const next = digits.map((item, itemIndex) => (itemIndex === index ? char : item)).join("");
              write(next);
              if (char && index < 5) refs.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index] && index > 0) {
                const next = digits.map((item, itemIndex) => (itemIndex === index - 1 ? "" : item)).join("");
                write(next);
                refs.current[index - 1]?.focus();
              }
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (!text) return;
              event.preventDefault();
              write(text);
              refs.current[Math.min(text.length, 5)]?.focus();
            }}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
