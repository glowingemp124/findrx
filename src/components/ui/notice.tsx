import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/cn";

const NOTICE_TONES = {
  accent: { className: "bg-accent-soft text-accent-text", icon: "lock" },
  warn: { className: "bg-warn-soft text-warn", icon: "info" },
  bad: { className: "bg-bad-soft text-bad", icon: "alert" },
} as const satisfies Record<string, { className: string; icon: IconName }>;

export function Notice({ tone, icon, children }: { tone: keyof typeof NOTICE_TONES; icon?: IconName; children: ReactNode }) {
  const style = NOTICE_TONES[tone];
  return (
    <p role={tone === "bad" ? "alert" : undefined} className={cn("flex gap-2.5 rounded-[14px] px-4 py-3 text-md", style.className)}>
      <Icon name={icon ?? style.icon} className="mt-0.5 size-4" />
      <span>{children}</span>
    </p>
  );
}
