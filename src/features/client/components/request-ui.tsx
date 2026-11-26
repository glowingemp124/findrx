import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Centered column used by every request page. */
export function RequestPageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto grid max-w-[720px] gap-4 px-4 pt-6 pb-12 sm:gap-6 sm:px-5 sm:pt-10 sm:pb-20">{children}</div>;
}

export function RequestCard({ children }: { children: ReactNode }) {
  return <section className="card rise-in grid gap-5 p-5 sm:gap-6 sm:p-8">{children}</section>;
}

type StepperProps = {
  steps: [string, string, string, string];
  /** Index of the step in progress. Earlier steps show as done; 4 means all done. */
  current: number;
};

export function RequestStepper({ steps, current }: StepperProps) {
  return (
    <ol className="grid grid-cols-4 gap-2.5" aria-label="Progress">
      {steps.map((label, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} className="grid gap-2">
            <span className="h-1.5 overflow-hidden rounded-full bg-line-strong">
              <span
                className={cn(
                  "block h-full rounded-full bg-accent transition-[width] duration-700",
                  state === "done" ? "w-full" : state === "current" ? "w-1/2" : "w-0",
                )}
              />
            </span>
            <span className={cn("text-xs sm:text-sm", state === "current" ? "font-bold text-ink" : "text-muted")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RequestHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[clamp(26px,4vw,36px)] leading-[1.12] font-bold tracking-[-0.02em]">{title}</h1>
      {children ? <p className="mt-2.5 text-lg text-ink-2">{children}</p> : null}
    </div>
  );
}

export function DetailList({ rows }: { rows: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-0.5 sm:grid-cols-[180px_1fr] sm:gap-6">
          <dt className="text-md text-muted">{label}</dt>
          <dd className="text-md font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Countdown({ label, value, note, tone = "plain" }: { label: string; value: string; note: string; tone?: "plain" | "accent" }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-2", tone === "accent" && "rounded-[16px] bg-accent-soft px-4 py-3.5 sm:px-5 sm:py-4")}>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-[34px] leading-none font-bold tracking-tight tabular-nums sm:text-[40px]" role="timer" aria-live="off">
          {value}
        </p>
      </div>
      <p className="max-w-[380px] text-md text-ink-2">{note}</p>
    </div>
  );
}
