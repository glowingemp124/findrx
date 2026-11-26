import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/use-count-up";

type StatCardProps = {
  label: string;
  value: number;
  /** When set, shows "value / limit" with a meter. */
  limit?: number;
  delay?: number;
};

export function StatCard({ label, value, limit, delay = 0 }: StatCardProps) {
  const shown = Math.round(useCountUp(value, 700));
  const share = limit ? Math.min(1, value / limit) : 0;
  return (
    <div className="card rise-in flex flex-col gap-1 p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-muted">{label}</p>
      <p className="text-[28px] leading-tight font-bold tracking-tight tabular-nums">
        {shown}
        {limit ? <span className="text-muted"> / {limit}</span> : null}
      </p>
      {limit ? (
        <span className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-strong" aria-hidden>
          <span
            className={cn("block h-full rounded-full transition-[width] duration-700", share >= 1 ? "bg-bad" : "bg-accent")}
            style={{ width: `${share * 100}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}
