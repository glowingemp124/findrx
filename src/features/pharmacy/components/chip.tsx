import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-side-well text-ink-2",
  accent: "bg-accent-soft text-accent-text",
  warn: "bg-warn-soft text-warn",
} as const;

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold", TONES[tone])}>{children}</span>;
}
