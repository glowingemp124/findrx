import { useState } from "react";
import { cn } from "@/lib/cn";

export type DonutSlice = { label: string; value: number; color: string };

/** Donut with 2px gaps between segments, the total in the middle and a legend with shares. */
export function DonutChart({ data, centerLabel, ariaLabel }: { data: DonutSlice[]; centerLabel: string; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const size = 168;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 0 && data.filter((slice) => slice.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  const share = (value: number) => (total ? Math.round((value / total) * 100) : 0);
  const shown = hover !== null ? data[hover] : null;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={ariaLabel} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--side-well)" strokeWidth={stroke} />
          {data.map((slice, index) => {
            const length = total ? (slice.value / total) * circumference : 0;
            const dash = Math.max(0, length - gap);
            const element = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === index ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer transition-[stroke-width] duration-200"
              />
            );
            offset += length;
            return element;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <p className="text-2xl font-bold tabular-nums">{(shown?.value ?? total).toLocaleString("en-US")}</p>
          <p className="text-xs text-muted">{shown ? `${shown.label} · ${share(shown.value)}%` : centerLabel}</p>
        </div>
      </div>
      <ul className="grid min-w-[180px] flex-1 gap-2">
        {data.map((slice, index) => (
          <li
            key={slice.label}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            className={cn("flex items-center justify-between gap-3 rounded-[10px] px-2 py-1 text-md transition-colors", hover === index && "bg-side-hover")}
          >
            <span className="flex items-center gap-2 text-ink-2">
              <span className="size-2.5 rounded-[3px]" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <span className="font-semibold tabular-nums">
              {slice.value.toLocaleString("en-US")} <span className="font-normal text-muted">· {share(slice.value)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
