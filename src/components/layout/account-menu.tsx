import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export type AccountMenuItem =
  | { label: string; icon: IconName; to: string }
  | { label: string; icon: IconName; onSelect: () => void; tone?: "danger" };

type AccountMenuProps = {
  name: string;
  email: string;
  /** Extra line under the name, e.g. the pharmacy. */
  detail?: string;
  /** Profile photo; initials are shown without one. */
  avatarUrl?: string | null;
  items: AccountMenuItem[];
};

/** Avatar button that opens a small account popover. */
export function AccountMenu({ name, email, detail, avatarUrl, items }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = "flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-md font-semibold transition-colors hover:bg-side-hover";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Account: ${name}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="cursor-pointer rounded-full ring-offset-2 ring-offset-canvas transition-shadow hover:ring-2 hover:ring-accent-soft focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar name={name} src={avatarUrl} />
      </button>

      {open ? (
        <div
          id={menuId}
          className="modal-in absolute top-full right-0 z-40 mt-2 w-[min(280px,calc(100vw-32px))] overflow-hidden rounded-[18px] bg-panel shadow-pop ring-1 ring-line-strong"
        >
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={name} src={avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-bold">{name}</p>
              {detail ? <p className="truncate text-sm text-ink-2">{detail}</p> : null}
              <p className="truncate text-sm text-muted">{email}</p>
            </div>
          </div>
          <ul className="grid gap-0.5 p-1.5">
            {items.map((item) => (
              <li key={item.label}>
                {"to" in item ? (
                  <Link to={item.to} className={cn(itemClass, "text-ink")}>
                    <Icon name={item.icon} className="size-4 text-ink-2" />
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(itemClass, item.tone === "danger" ? "text-bad" : "text-ink")}
                  >
                    <Icon name={item.icon} className="size-4" />
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
