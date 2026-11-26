import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PanelProps = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Titled card for dashboard widgets and detail sections. */
export function Panel({ title, subtitle, action, children, className, delay = 0 }: PanelProps) {
  return (
    <section className={cn("card rise-in flex flex-col p-5 sm:p-6", className)} style={{ animationDelay: `${delay}ms` }}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
