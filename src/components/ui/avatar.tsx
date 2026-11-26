import { cn } from "@/lib/cn";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

const SIZES = { sm: "size-8 text-xs", md: "size-9 text-sm", lg: "size-11 text-base", xl: "size-20 text-2xl" } as const;

/** Profile photo, or initials on the accent color when there's none. */
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-bold text-accent-ink", SIZES[size], className)}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
