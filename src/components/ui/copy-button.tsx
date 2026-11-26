import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

type CopyButtonProps = {
  value: string;
  /** What is being copied, for screen readers, e.g. "code". */
  label: string;
  className?: string;
};

/** Copies a value to the clipboard and confirms with a check for a moment. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (e.g. insecure context); the value stays visible to copy by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        "inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:bg-side-hover hover:text-ink",
        copied && "text-good hover:text-good",
        className,
      )}
    >
      <Icon name={copied ? "check" : "copy"} className="size-4" />
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

/** A code shown in a pill with a copy button beside it. */
export function CopyableCode({ code, label = "code", className }: { code: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-side-well py-0.5 pr-0.5 pl-3", className)}>
      <span className="font-bold tracking-[0.2em] text-ink tabular-nums">{code}</span>
      <CopyButton value={code} label={label} />
    </span>
  );
}
