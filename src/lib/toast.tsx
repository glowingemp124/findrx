import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "info" | "warn" | "error";

type ToastOptions = {
  tone?: ToastTone;
  /** Second line with more detail. */
  description?: string;
  /** Milliseconds before it closes itself. */
  duration?: number;
};

type Toast = Required<Pick<ToastOptions, "tone" | "duration">> & { id: number; title: string; description?: string; leaving: boolean };

type ToastContextValue = {
  push: (title: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONES: Record<ToastTone, { icon: IconName; className: string; bar: string }> = {
  success: { icon: "circleCheck", className: "bg-good-soft text-good", bar: "bg-good" },
  info: { icon: "info", className: "bg-info-soft text-info", bar: "bg-info" },
  warn: { icon: "alert", className: "bg-warn-soft text-warn", bar: "bg-warn" },
  error: { icon: "circleAlert", className: "bg-bad-soft text-bad", bar: "bg-bad" },
};

const EXIT_MS = 220;
const MAX_VISIBLE = 4;

function ToastCard({ toast, onClose: dismiss }: { toast: Toast; onClose: (id: number) => void }) {
  const onClose = useCallback(() => dismiss(toast.id), [dismiss, toast.id]);
  const tone = TONES[toast.tone];
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);

  // Timed in JS rather than by the bar's animation, which reduced-motion settings shorten to nothing.
  useEffect(() => {
    if (paused || toast.leaving) return;
    const started = Date.now();
    const timer = window.setTimeout(onClose, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, toast.leaving, onClose]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[16px] bg-panel p-3.5 pr-10 text-ink shadow-pop ring-1 ring-line-strong",
        toast.leaving ? "toast-out" : "toast-in",
      )}
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", tone.className)}>
        <Icon name={tone.icon} className="size-[18px]" />
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-md leading-snug font-semibold">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-sm text-muted">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 grid size-7 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-side-hover hover:text-ink"
      >
        <Icon name="close" className="size-4" />
      </button>
      <span
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-[3px] origin-left opacity-60", tone.bar)}
        style={{
          width: "100%",
          animation: `toast-timer ${toast.duration}ms linear forwards`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}

/** Top-right notifications. Pausing on hover keeps a toast open while it's read. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback((title: string, options: ToastOptions = {}) => {
    const toast: Toast = {
      id: Date.now() + Math.random(),
      title,
      description: options.description,
      tone: options.tone ?? "success",
      duration: options.duration ?? 4200,
      leaving: false,
    };
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), toast]);
  }, []);

  // Escape dismisses the newest toast.
  useEffect(() => {
    if (!toasts.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const newest = [...toasts].reverse().find((toast) => !toast.leaving);
        if (newest) dismiss(newest.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toasts, dismiss]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-3 right-3 left-3 z-[90] flex flex-col items-end gap-2 sm:top-4 sm:right-4 sm:left-auto sm:w-[380px]"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
