import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/use-count-up";

type KpiCardProps = {
  label: string;
  value: number;
  format: (value: number) => string;
  caption: string;
  /** Change against the previous period, as a fraction (0.12 = +12%). */
  change?: number;
  /** Whether a rise is good (searches) or bad (expirations). */
  higherIsBetter?: boolean;
  delay?: number;
};

export function KpiCard({ label, value, format, caption, change, higherIsBetter = true, delay = 0 }: KpiCardProps) {
  const shown = useCountUp(value, 800);
  const hasChange = change !== undefined && Number.isFinite(change) && Math.abs(change) >= 0.005;
  const good = hasChange && (change! > 0) === higherIsBetter;

  return (
    <div className="card rise-in grid content-start gap-1 p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-muted">{label}</p>
      <p className="text-[26px] leading-tight font-bold tracking-tight tabular-nums sm:text-[28px]">{format(shown)}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        {hasChange ? (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", good ? "text-good" : "text-bad")}>
            <Icon name={change! > 0 ? "trendingUp" : "trendingDown"} className="size-3.5" />
            {Math.abs(Math.round(change! * 100))}%
            <span className="sr-only">{good ? "(better)" : "(worse)"} than the previous period</span>
          </span>
        ) : null}
        <span className="text-muted">{caption}</span>
      </div>
    </div>
  );
}
