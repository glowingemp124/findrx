import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { control } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string | number> = { value: T; label: string };

type SelectProps<T extends string | number> = {
  label: string;
  value: T | null;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Keep the label for screen readers only, e.g. in a compact toolbar. */
  hideLabel?: boolean;
  /** Shorter control for dense rows. */
  compact?: boolean;
};

const GAP = 6;
const MAX_LIST_HEIGHT = 256;
const VIEWPORT_MARGIN = 8;

/**
 * Where the list goes: under the button, or above it when there's no room below. It's portalled
 * to <body> with fixed positioning, so scroll containers (tables, modals, cards) never clip it.
 */
function placeList(button: HTMLElement, optionCount: number): CSSProperties {
  const rect = button.getBoundingClientRect();
  const height = Math.min(MAX_LIST_HEIGHT, optionCount * 40 + 12);
  const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const above = rect.top - VIEWPORT_MARGIN;
  const up = below < height + GAP && above > below;
  const width = Math.max(rect.width, 160);
  const left = Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN);
  return {
    position: "fixed",
    left: Math.max(VIEWPORT_MARGIN, left),
    width,
    maxHeight: Math.max(120, Math.min(MAX_LIST_HEIGHT, (up ? above : below) - GAP)),
    ...(up ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
  };
}

/**
 * Styled single-select following the WAI-ARIA listbox pattern: arrow keys, Home/End,
 * Enter/Space to pick, Escape to close, and first-letter type-ahead.
 */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose",
  error,
  hint,
  className,
  hideLabel = false,
  compact = false,
}: SelectProps<T>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));
  const selected = options[selectedIndex];

  const reposition = useCallback(() => {
    if (buttonRef.current) setPosition(placeList(buttonRef.current, options.length));
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    // Follow the button when the page or a container scrolls; the list itself may scroll freely.
    const onScroll = (event: Event) => {
      if (event.target !== listRef.current) reposition();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (open) listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openList = () => {
    setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    close();
  };

  const onButtonKey = (event: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  };

  const onListKey = (event: KeyboardEvent) => {
    const last = options.length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(activeIndex + 1, last),
      ArrowUp: () => Math.max(activeIndex - 1, 0),
      Home: () => 0,
      End: () => last,
    };
    if (moves[event.key]) {
      event.preventDefault();
      setActiveIndex(moves[event.key]());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      // Don't let a surrounding modal close too.
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key.length === 1) {
      const letter = event.key.toLowerCase();
      const match = options.findIndex((option, index) => index > activeIndex && option.label.toLowerCase().startsWith(letter));
      const wrapped = match >= 0 ? match : options.findIndex((option) => option.label.toLowerCase().startsWith(letter));
      if (wrapped >= 0) setActiveIndex(wrapped);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative grid min-w-0 content-start gap-1.5 text-sm", className)}>
      <span id={`${id}-label`} className={hideLabel ? "sr-only" : "font-semibold text-ink-2"}>
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
        className={cn(
          control,
          "flex min-w-0 cursor-pointer items-center justify-between gap-2 text-left",
          compact && "h-9 px-3 text-sm",
          error && "is-shake",
        )}
      >
        <span id={`${id}-value`} className={cn("truncate", !selected && "text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <Icon name="chevron" className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open
        ? createPortal(
            <ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={`${id}-label`}
              aria-activedescendant={`${id}-option-${activeIndex}`}
              onKeyDown={onListKey}
              style={position}
              className="modal-in z-[85] overflow-y-auto rounded-[14px] bg-panel p-1.5 text-sm shadow-pop ring-1 ring-line-strong outline-none"
            >
              {options.map((option, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={String(option.value)}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(index)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-md whitespace-nowrap text-ink",
                      index === activeIndex && "bg-side-hover",
                      isSelected && "font-semibold text-accent-text",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <Icon name="check" className="size-4 shrink-0" /> : null}
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}

      {error ? (
        <span role="alert" className="text-xs font-semibold text-bad">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
