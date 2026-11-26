export type RankedItem = { label: string; value: number; detail?: string };

/** Horizontal bars for a ranked list (top medications, top pharmacies). Labels and values in text inks. */
export function RankedBars({ items, format = (value) => value.toLocaleString("en-US") }: { items: RankedItem[]; format?: (value: number) => string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ol className="grid gap-3">
      {items.map((item, index) => (
        <li key={item.label} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-md">
            <span className="min-w-0 truncate text-ink-2">
              <span className="mr-2 text-muted tabular-nums">{index + 1}</span>
              {item.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {format(item.value)}
              {item.detail ? <span className="ml-1 font-normal text-muted">{item.detail}</span> : null}
            </span>
          </div>
          <span className="h-2 overflow-hidden rounded-full bg-side-well">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
