export type ResolvedTheme = "light" | "dark";

const KEY = "findrx-theme";

export function readTheme(): ResolvedTheme {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(next: ResolvedTheme, origin?: HTMLElement) {
  const commit = () => {
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = document.startViewTransition?.bind(document);
  if (!start || reduced) {
    commit();
    return;
  }

  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : 40;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight - 40;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  start(commit)
    .ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 450,
          easing: "cubic-bezier(.65, 0, .35, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}
