import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const BADGE_TONES = {
  accent: "bg-accent-soft text-accent-text",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  muted: "bg-side-well text-ink-2",
} as const;

export function Badge({ tone, children, pulse = false }: { tone: keyof typeof BADGE_TONES; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold", BADGE_TONES[tone])}>
      {pulse ? (
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-current" />
        </span>
      ) : null}
      {children}
    </span>
  );
}
