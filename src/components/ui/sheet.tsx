import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** A panel that rises over the current page. Closing it leaves the page where it was. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [present, setPresent] = useState(open);
  const closing = present && !open;

  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setPresent(false), 240);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!present) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [present, open, onClose]);

  if (!present) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close"
        className={cn("absolute inset-0 cursor-pointer bg-overlay", closing ? "overlay-out" : "overlay-in")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={cn(
          "relative flex max-h-[min(680px,85dvh)] w-full flex-col overflow-hidden rounded-t-[24px] bg-panel text-ink shadow-pop sm:max-w-[640px] sm:rounded-[26px]",
          closing ? "modal-out" : "modal-in",
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 id="sheet-title" className="min-w-0 flex-1 text-xl font-bold tracking-tight">
            {title}
          </h2>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <Icon name="close" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
