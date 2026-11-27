import { useState } from "react";
import { ChartTooltip, niceMax } from "@/components/charts/chart-tooltip";
import { useElementWidth } from "@/lib/use-element-width";

export type BarDatum = { label: string; value: number; /** Optional inner bar, drawn from the baseline (e.g. claimed within searched). */ inner?: number; detail?: string };

type BarChartProps = {
  data: BarDatum[];
  height?: number;
  /** Names for the tooltip rows. */
  valueLabel: string;
  innerLabel?: string;
  format?: (value: number) => string;
  /** Show the value above each bar. Only for short series. */
  showValues?: boolean;
  /** Label every nth tick on the x axis when bars get dense. */
  tickEvery?: number;
  ariaLabel: string;
};

const OUTER = "var(--accent-soft-solid)";
const INNER = "var(--accent)";

/** Vertical bars with an optional inner bar, gridlines, hover tooltip and rounded tops. */
export function BarChart({
  data,
  height = 240,
  valueLabel,
  innerLabel,
  format = (value) => value.toLocaleString("en-US"),
  showValues = data.length <= 8,
  tickEvery = 1,
  ariaLabel,
}: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const top = showValues ? 22 : 10;
  const bottom = 26;
  const left = 36;
  const plotHeight = height - top - bottom;
  const max = niceMax(Math.max(...data.map((item) => item.value), 0));
  const slot = data.length ? (width - left) / data.length : 0;
  const barWidth = Math.max(4, Math.min(56, slot * 0.62));
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const ticks = [0, 0.5, 1].map((share) => share * max);

  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="overflow-visible">
          {ticks.map((tick, index) => (
            <g key={index}>
              <line x1={left} x2={width} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
              <text x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {format(tick)}
              </text>
            </g>
          ))}
          {data.map((item, index) => {
            const x = left + slot * index + (slot - barWidth) / 2;
            const radius = Math.min(4, barWidth / 2);
            const active = hover === index;
            return (
              <g key={`${item.label}-${index}`} onMouseEnter={() => setHover(index)}>
                {/* Hit target wider than the bar. */}
                <rect x={left + slot * index} y={top} width={slot} height={plotHeight} fill="transparent" />
                <rect
                  x={x}
                  y={y(item.value)}
                  width={barWidth}
                  height={Math.max(0, top + plotHeight - y(item.value))}
                  rx={radius}
                  fill={innerLabel ? OUTER : INNER}
                  opacity={hover === null || active ? 1 : 0.55}
                  className="transition-opacity duration-200"
                />
                {item.inner !== undefined ? (
                  <rect
                    x={x}
                    y={y(item.inner)}
                    width={barWidth}
                    height={Math.max(0, top + plotHeight - y(item.inner))}
                    rx={radius}
                    fill={INNER}
                    opacity={hover === null || active ? 1 : 0.55}
                    className="transition-opacity duration-200"
                  />
                ) : null}
                {showValues ? (
                  <text x={x + barWidth / 2} y={y(item.value) - 6} textAnchor="middle" className="fill-ink-2 text-[11px] font-semibold tabular-nums">
                    {format(item.value)}
                  </text>
                ) : null}
                {index % tickEvery === 0 ? (
                  <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                    {item.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          <line x1={left} x2={width} y1={top + plotHeight} y2={top + plotHeight} stroke="var(--line-2)" />
        </svg>
      ) : null}
      {hover !== null && data[hover] ? (
        <ChartTooltip
          align={left + slot * hover < width * 0.25 ? "left" : left + slot * hover > width * 0.75 ? "right" : "center"}
          x={left + slot * hover + slot / 2}
          y={y(data[hover].value)}
          title={data[hover].detail ?? data[hover].label}
          rows={[
            { label: valueLabel, value: format(data[hover].value), color: innerLabel ? OUTER : INNER },
            ...(innerLabel && data[hover].inner !== undefined ? [{ label: innerLabel, value: format(data[hover].inner!), color: INNER }] : []),
          ]}
        />
      ) : null}
    </div>
  );
}
