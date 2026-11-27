import { Button } from "@/components/ui/button";
import { formatDistanceBand, formatTimeAgo, genericLabel } from "@/features/requests/lib/formatters";
import type { FeedItem } from "@/features/pharmacy/lib/feed";
import { Chip } from "@/features/pharmacy/components/chip";

type RequestCardProps = {
  item: FeedItem;
  now: number;
  disabled: boolean;
  onClaim: (item: FeedItem) => void;
  delay?: number;
  onList?: boolean;
};

export function RequestCard({ item, now, disabled, onClaim, delay = 0, onList = false }: RequestCardProps) {
  return (
    <article
      className="card rise-in flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight">{item.medication}</h2>
        {item.details ? <p className="mt-0.5 text-md text-ink-2">{item.details}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>Generic: {genericLabel(item.genericPreference)}</Chip>
          {item.manufacturer ? <Chip>Maker: {item.manufacturer}</Chip> : null}
          {item.needsCompounding ? <Chip tone="warn">Compounding needed</Chip> : null}
          {onList ? <Chip tone="accent">On your list</Chip> : null}
          <Chip tone={item.fulfilment === "delivery" ? "accent" : "neutral"}>
            {item.fulfilment === "delivery" ? "Delivery requested" : "Pickup"}
          </Chip>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <p className="text-sm whitespace-nowrap text-muted">
          {formatDistanceBand(item.distanceBand, true)} · {formatTimeAgo(item.postedAt, now)}
        </p>
        <Button variant="primary" size="lg" className="w-full sm:w-auto" disabled={disabled} onClick={() => onClaim(item)}>
          {onList ? "Claim · on your list" : "Claim"}
        </Button>
      </div>
    </article>
  );
}
