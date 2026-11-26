import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo, LogoMark, Wordmark } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/icons";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { applyTheme, readTheme } from "@/lib/theme";

export type ShellNavItem = {
  to: string;
  label: string;
  icon: IconName;
  /** Count shown on the right (a dot when the sidebar is a rail); hidden when 0. */
  badge?: number;
};

type DashboardShellProps = {
  homeTo: string;
  /** Small line under the FindRx wordmark, e.g. "Pharmacy portal". */
  subtitle: string;
  nav: ShellNavItem[];
  /** Bottom of the expanded sidebar, e.g. who is signed in. Hidden on the icon rail. */
  footer?: ReactNode;
  /** Right side of the top bar, after the theme switch, e.g. an account menu. */
  headerActions?: ReactNode;
};

const RAIL_KEY = "findrx-rail";
const EASE = "cubic-bezier(0.22,1,0.36,1)";

/** Collapsed-to-icons preference for wide screens. Toggle with the button or the "[" key. */
function useRail() {
  const [rail, setRailState] = useState(() => localStorage.getItem(RAIL_KEY) === "1");

  const setRail = useCallback((next: boolean) => {
    setRailState(next);
    localStorage.setItem(RAIL_KEY, next ? "1" : "0");
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "[" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (window.innerWidth < 1280) return;
      event.preventDefault();
      setRail(!rail);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rail, setRail]);

  return [rail, setRail] as const;
}

/** The nav item for the current page: the longest `to` the path starts with. */
function useActiveTo(nav: ShellNavItem[]) {
  const { pathname } = useLocation();
  return nav
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}

/** The accent pill behind the active item slides between items (and follows rail changes). */
function useActivePill(navRef: RefObject<HTMLElement | null>, activeTo: string | undefined, layoutKey: string) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const previousLayout = useRef(layoutKey);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;

    const measure = () => {
      const item = activeTo ? nav.querySelector<HTMLElement>(`[data-nav="${CSS.escape(activeTo)}"]`) : null;
      if (!item) return null;
      return { top: `${item.offsetTop}px`, left: `${item.offsetLeft}px`, width: `${item.offsetWidth}px`, height: `${item.offsetHeight}px` };
    };
    const place = (box: ReturnType<typeof measure>) => {
      pill.getAnimations().forEach((animation) => animation.cancel());
      if (box) Object.assign(pill.style, box, { opacity: "1" });
      else pill.style.opacity = "0";
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = measure();
    const layoutChanged = previousLayout.current !== layoutKey;
    previousLayout.current = layoutKey;
    let frame = 0;

    if (layoutChanged && !reduced) {
      // Follow the item while the sidebar animates its width.
      const until = performance.now() + 480;
      const step = (now: number) => {
        place(measure());
        if (now < until) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    } else if (!reduced && next && pill.style.width && pill.style.opacity !== "0") {
      const from = { top: pill.style.top, left: pill.style.left, width: pill.style.width, height: pill.style.height };
      const animation = pill.animate([from, next], { duration: 450, easing: EASE });
      animation.onfinish = () => place(next);
    } else {
      place(next);
    }

    const observer = new ResizeObserver(() => place(measure()));
    observer.observe(nav);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [navRef, activeTo, layoutKey]);

  return pillRef;
}

function ThemeSwitch() {
  const [theme, setTheme] = useState(readTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <IconButton
      label={`Switch to ${next} mode`}
      onClick={(event) => {
        applyTheme(next, event.currentTarget);
        setTheme(next);
      }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </IconButton>
  );
}

/**
 * Sidebar layout shared by the pharmacy and admin dashboards. Floating panel: full width on
 * wide screens (collapsible to an icon rail), icon rail on tablets, slide-in drawer on phones.
 */
export function DashboardShell({ homeTo, subtitle, nav, footer, headerActions }: DashboardShellProps) {
  const [rail, setRail] = useRail();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const activeTo = useActiveTo(nav);
  const pillRef = useActivePill(navRef, activeTo, `${rail}-${mobileOpen}`);

  // A new page starts at the top (query-only changes like ?range= keep the scroll position).
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Text that folds away when the sidebar is an icon rail (tablets always, wide screens when collapsed).
  const label = cn(
    "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
    "max-md:max-w-[160px] max-md:opacity-100",
    "md:max-w-0 md:opacity-0",
    !rail && "xl:max-w-[160px] xl:opacity-100",
  );
  const expandedOnly = cn("max-md:block md:hidden", !rail && "xl:block");

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-30 cursor-pointer bg-overlay transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Sidebar"
        className={cn(
          "fixed z-40 flex flex-col overflow-hidden bg-side text-side-ink shadow-[inset_0_0_0_1px_var(--side-line),var(--shadow)]",
          "transition-[width,padding,transform] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "max-md:inset-y-0 max-md:left-0 max-md:w-[248px] max-md:gap-2 max-md:px-3 max-md:py-3.5",
          "md:top-3 md:bottom-3 md:left-3 md:w-[68px] md:items-center md:gap-2.5 md:rounded-[22px] md:px-3 md:py-3.5",
          !rail && "xl:w-[236px] xl:items-stretch xl:px-3",
          mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
        )}
      >
        <div className={cn("flex w-full items-center gap-2", "md:flex-col md:gap-2.5", !rail && "xl:flex-row xl:gap-2 xl:px-0.5")}>
          <Link
            to={homeTo}
            aria-label="FindRx home"
            className={cn("flex min-w-0 flex-1 items-center gap-2.5", "md:w-10 md:flex-none md:justify-center md:gap-0", !rail && "xl:flex-1 xl:justify-start xl:gap-2.5")}
          >
            <LogoMark className="drop-shadow-[0_8px_12px_color-mix(in_oklab,var(--accent)_35%,transparent)]" />
            <span className={cn("min-w-0", label)}>
              <Wordmark className="block text-[20px] leading-none" />
              <small className="mt-1 block text-[11px] leading-none font-semibold text-side-muted">{subtitle}</small>
            </span>
          </Link>
          <button
            type="button"
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={rail}
            title="Collapse  ["
            onClick={() => setRail(!rail)}
            className="hidden size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] text-side-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--side-ink)_14%,transparent)] transition-colors hover:bg-side-hover xl:grid"
          >
            <Icon name="panel" className={cn("size-[18px] transition-transform duration-300", rail && "-scale-x-100")} />
          </button>
          <IconButton label="Close menu" size="sm" className="md:hidden" onClick={() => setMobileOpen(false)}>
            <Icon name="close" />
          </IconButton>
        </div>

        <nav
          ref={navRef}
          aria-label="Main"
          className={cn("relative flex min-h-0 w-full flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto pt-4", "md:items-center", !rail && "xl:items-stretch xl:gap-2")}
        >
          <span ref={pillRef} aria-hidden className="pointer-events-none absolute top-0 left-0 h-10 w-0 rounded-[14px] bg-accent opacity-0" />
          {nav.map((item) => {
            const active = item.to === activeTo;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-nav={item.to}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  "relative z-10 flex h-10 w-full shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-[14px] px-3 text-md font-semibold",
                  "transition-[padding,gap,color] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "md:justify-center md:gap-0 md:px-0",
                  !rail && "xl:justify-start xl:gap-3 xl:px-3",
                  active ? "text-accent-ink" : "text-side-ink hover:bg-side-hover",
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "size-5 shrink-0 md:absolute md:top-1/2 md:left-1/2 md:size-[18px] md:-translate-x-1/2 md:-translate-y-1/2",
                    !rail && "xl:static xl:size-5 xl:translate-none",
                    active ? "text-accent-ink" : "text-side-muted",
                  )}
                />
                <span className={label}>{item.label}</span>
                {item.badge ? (
                  <>
                    {/* Dot on the icon rail, count when expanded. */}
                    <span className={cn("absolute top-2 right-2.5 hidden size-2 rounded-full bg-count ring-2 ring-side md:block", !rail && "xl:hidden")} />
                    <span
                      className={cn(
                        "ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-count px-1 text-[10px] leading-none font-bold text-white tabular-nums",
                        active && "bg-white/25 text-accent-ink",
                        "md:hidden",
                        !rail && "xl:inline-flex",
                      )}
                    >
                      {item.badge}
                    </span>
                  </>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        {footer ? <div className={cn("w-full border-t border-side-line px-1 pt-3", expandedOnly)}>{footer}</div> : null}
      </aside>

      <div className={cn("transition-[padding] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:pl-[80px]", !rail && "xl:pl-[248px]")}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-canvas/85 px-3 backdrop-blur sm:px-5 md:h-16 md:pr-6 md:pl-5">
          <div className="flex items-center gap-1 md:hidden">
            <IconButton label="Open menu" onClick={() => setMobileOpen(true)}>
              <Icon name="menu" />
            </IconButton>
            <Link to={homeTo} aria-label="FindRx home" className="flex h-8 items-center">
              <Logo className="h-8" alt="" />
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <ThemeSwitch />
            {headerActions}
          </div>
        </header>

        <main>
          {/* Grid children may shrink below their content, so wide tables scroll inside their card on phones. */}
          <div key={pathname} className="page-in w-full min-w-0 px-4 pt-1 pb-8 sm:px-5 md:pr-6 md:pl-5 [&_.grid>*]:min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
