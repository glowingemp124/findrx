import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Compact dialogs such as a single code entry. */
  narrow?: boolean;
};

export function Modal({ open, title, description, onClose, children, footer, wide = false, narrow = false }: ModalProps) {
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
    <div className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Close dialog"
        className={cn("absolute inset-0 cursor-pointer bg-overlay", closing ? "overlay-out" : "overlay-in")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex max-h-[calc(100dvh-40px)] w-full flex-col overflow-hidden rounded-[26px] bg-panel text-ink shadow-pop",
          closing ? "modal-out" : "modal-in",
          wide ? "max-w-[760px]" : narrow ? "max-w-[420px]" : "max-w-[520px]",
        )}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && closing) setPresent(false);
        }}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-1 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <Icon name="close" />
          </IconButton>
        </div>
        {children ? <div className="overflow-y-auto px-5 pt-3 pb-2 sm:px-6">{children}</div> : null}
        {footer ? <div className="flex justify-end gap-2 px-5 pt-3 pb-5 sm:px-6">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
