import { cn } from "@/lib/cn";

const ASSETS = "/logo/svg";

/**
 * The FindRx icon (magnifier over a pill). The "small" artwork has heavier strokes and reads
 * better at sidebar and favicon sizes; use "large" from about 48px up.
 */
export function LogoMark({ className, variant = "small" }: { className?: string; variant?: "small" | "large" }) {
  return (
    <img
      src={`${ASSETS}/${variant === "small" ? "icon-small" : "icon"}.svg`}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("size-10 shrink-0 select-none", className)}
    />
  );
}

/** Icon and wordmark. Swaps to the dark-background artwork with the app theme. */
export function Logo({ className, alt = "FindRx" }: { className?: string; alt?: string }) {
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <img src={`${ASSETS}/logo-for-light-bg.svg`} alt={alt} draggable={false} className="h-full w-auto select-none dark:hidden" />
      <img src={`${ASSETS}/logo-for-dark-bg.svg`} alt={alt} draggable={false} className="hidden h-full w-auto select-none dark:block" />
    </span>
  );
}

/** "FindRx" set in type with the brand's teal "Rx", for places that pair the mark with other text. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <b className={cn("font-bold tracking-tight", className)}>
      Find<span className="text-accent-text">Rx</span>
    </b>
  );
}
