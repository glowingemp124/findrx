import type { ReactNode } from "react";

export type TooltipRow = { label: string; value: string; color?: string };

/** Floating tooltip positioned inside a `relative` chart container. Text uses text tokens, never the series color. */
export function ChartTooltip({ x, y, title, rows, align = "center" }: { x: number; y: number; title: ReactNode; rows: TooltipRow[]; align?: "center" | "left" | "right" }) {
  const translate = align === "left" ? "translate(8px, -100%)" : align === "right" ? "translate(calc(-100% - 8px), -100%)" : "translate(-50%, calc(-100% - 10px))";
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 min-w-[140px] rounded-[12px] bg-panel px-3 py-2 text-sm shadow-pop ring-1 ring-line-strong"
      style={{ left: x, top: y, transform: translate }}
    >
      <p className="font-semibold text-ink">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="mt-0.5 flex items-center justify-between gap-4 text-ink-2">
          <span className="flex items-center gap-1.5">
            {row.color ? <span className="size-2 rounded-full" style={{ background: row.color }} /> : null}
            {row.label}
          </span>
          <span className="font-semibold text-ink tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Rounds an axis maximum up to a friendly number. */
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}
