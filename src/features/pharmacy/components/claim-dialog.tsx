import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import type { FeedItem } from "@/features/pharmacy/lib/feed";

type ClaimDialogProps = {
  item: FeedItem | null;
  onCancel: () => void;
  /** Returns an error message when the claim fails. */
  onConfirm: (item: FeedItem) => string | null;
};

/** Asks the pharmacist to confirm stock (or compounding) before claiming. */
export function ClaimDialog({ item, onCancel, onConfirm }: ClaimDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setConfirmed(false);
    setError("");
    onCancel();
  };

  const claim = () => {
    if (!item) return;
    const message = onConfirm(item);
    if (message) setError(message);
    else {
      setConfirmed(false);
      setError("");
    }
  };

  const summary = item
    ? [item.medication, item.details, item.fulfilment === "delivery" ? "Delivery requested" : "Pickup"].filter(Boolean).join(" · ")
    : "";

  return (
    <Modal open={item !== null} onClose={close} title="Claim this request?" description={summary}>
      <div className="grid gap-4 pb-5">
        <Checkbox boxed checked={confirmed} onChange={setConfirmed}>
          {item?.needsCompounding ? (
            <>
              I confirm we <strong className="text-ink">can compound this</strong> as requested.
            </>
          ) : (
            <>
              I've checked: it is <strong className="text-ink">physically on our shelf</strong> right now.
            </>
          )}
        </Checkbox>
        <p className="text-md text-muted">
          The patient gets a text to pay within 1 hour. You'll see their name and number only after they pay. Claiming
          without stock is logged and can lead to suspension.
        </p>
        {error ? <Notice tone="bad">{error}</Notice> : null}
        <div className="flex flex-wrap gap-2.5">
          <Button variant="primary" size="lg" disabled={!confirmed} onClick={claim}>
            Claim request
          </Button>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
