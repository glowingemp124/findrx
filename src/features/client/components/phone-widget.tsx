import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { IconButton } from "@/components/ui/button";
import { CopyableCode } from "@/components/ui/copy-button";
import { formatClockTime } from "@/features/requests/lib/formatters";
import { smsStore } from "@/features/requests/services/sms-store";

const OPT_OUT = /\nReply STOP to opt out\.$/;

/**
 * A click outside should only dismiss this panel, not also act on what's underneath
 * (for example closing the verification dialog). Swallow the click that ends this gesture.
 */
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  document.addEventListener("click", swallow, { capture: true, once: true });
  document.addEventListener(
    "pointerup",
    () => window.setTimeout(() => document.removeEventListener("click", swallow, { capture: true })),
    { once: true },
  );
}

/**
 * Mock of the texts FindRx sends (codes, status updates) until a real SMS provider is connected.
 * It sits above modals so the code can be read while the verification dialog is open.
 */
export function PhoneWidget() {
  const messages = smsStore.use();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = messages.filter((message) => !message.read).length;

  const close = () => {
    setOpen(false);
    smsStore.markAllRead();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      close();
      swallowNextClick();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // Capture phase, so dismissing this panel runs before anything underneath sees the click.
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed right-3 bottom-3 z-[70] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          id="phone-messages"
          aria-label="Texts from FindRx"
          className="modal-in w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[20px] bg-panel text-ink shadow-pop ring-1 ring-line-strong"
        >
          <header className="flex items-center justify-between border-b border-line py-2 pr-2 pl-4">
            <h2 className="text-lg font-bold tracking-tight">Texts from FindRx</h2>
            <IconButton label="Close messages" size="sm" onClick={close}>
              <Icon name="close" />
            </IconButton>
          </header>
          <ul className="grid max-h-[min(420px,60dvh)] gap-2 overflow-y-auto bg-canvas p-3">
            {messages.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted">No messages yet. Texts from FindRx appear here.</li>
            ) : (
              // Newest first.
              [...messages].reverse().map((message) => (
                <li key={message.id} className="rounded-[14px] bg-card p-3 text-md ring-1 ring-line">
                  <p className="text-xs text-muted">FindRx · {formatClockTime(message.sentAt)}</p>
                  <p className="mt-1 whitespace-pre-line">
                    {message.body.replace(OPT_OUT, "")}
                    {message.link ? (
                      <>
                        {" "}
                        <Link to={message.link.to} onClick={close} className="font-semibold text-accent-text underline underline-offset-2">
                          {message.link.label}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {message.code ? (
                    <div className="mt-2">
                      <CopyableCode code={message.code} />
                    </div>
                  ) : null}
                  {/* <p className="mt-1 text-xs text-muted">Reply STOP to opt out.</p> */}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="phone-messages"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-11 cursor-pointer place-items-center rounded-full bg-ink text-card shadow-pop transition-opacity hover:opacity-90 sm:size-12"
      >
        <Icon name="bell" className="size-5" />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-count px-1 text-2xs font-bold text-white ring-2 ring-canvas"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
