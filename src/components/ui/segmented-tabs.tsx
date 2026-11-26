import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

export type SegmentedTab = {
  key: string;
  label: string;
  to: string;
  /** Shown in brackets after the label. */
  count?: number;
};

type SegmentedTabsProps = {
  label: string;
  items: SegmentedTab[];
  activeKey: string;
  className?: string;
};

/** Pill tabs that navigate (path or query string), so the active tab survives a refresh. */
export function SegmentedTabs({ label, items, activeKey, className }: SegmentedTabsProps) {
  return (
    <nav aria-label={label} className={cn("rise-in -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex gap-1 rounded-full bg-side-well p-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-md font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-300",
                active ? "bg-card text-ink shadow-raise" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
              {item.count !== undefined ? <span className="tabular-nums"> ({item.count})</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
