import { useId, useState, type PointerEvent } from "react";
import { ChartTooltip, niceMax } from "@/components/charts/chart-tooltip";
import { useElementWidth } from "@/lib/use-element-width";

export type AreaPoint = { label: string; value: number; detail?: string };

type AreaChartProps = {
  data: AreaPoint[];
  height?: number;
  valueLabel: string;
  format?: (value: number) => string;
  tickEvery?: number;
  ariaLabel: string;
};

/** Single-series line with a soft area fill and a crosshair tooltip. */
export function AreaChart({ data, height = 220, valueLabel, format = (v) => v.toLocaleString("en-US"), tickEvery = 1, ariaLabel }: AreaChartProps) {
  const gradientId = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const top = 12;
  const bottom = 26;
  const left = 48;
  const right = 8;
  const plotHeight = height - top - bottom;
  const plotWidth = Math.max(0, width - left - right);
  const max = niceMax(Math.max(...data.map((point) => point.value), 0));
  const x = (index: number) => left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const line = data.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");
  const area = data.length ? `${line} L${x(data.length - 1)},${top + plotHeight} L${x(0)},${top + plotHeight} Z` : "";

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(share * (data.length - 1)))));
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((share) => (
            <g key={share}>
              <line x1={left} x2={width - right} y1={y(share * max)} y2={y(share * max)} stroke="var(--line)" />
              <text x={left - 8} y={y(share * max)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {format(share * max)}
              </text>
            </g>
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((point, index) =>
            index % tickEvery === 0 ? (
              <text key={point.label} x={x(index)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                {point.label}
              </text>
            ) : null,
          )}
          {hover !== null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={top} y2={top + plotHeight} stroke="var(--line-2)" />
              <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
            </g>
          ) : null}
          <rect
            x={left}
            y={top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      ) : null}
      {hover !== null && data[hover] ? (
        <ChartTooltip
          x={x(hover)}
          y={y(data[hover].value)}
          align={x(hover) > width * 0.7 ? "right" : x(hover) < width * 0.3 ? "left" : "center"}
          title={data[hover].detail ?? data[hover].label}
          rows={[{ label: valueLabel, value: format(data[hover].value), color: "var(--accent)" }]}
        />
      ) : null}
    </div>
  );
}
