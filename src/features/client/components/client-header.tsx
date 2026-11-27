import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { paths } from "@/app/paths";
import { Icon } from "@/components/icons";
import { buttonStyles, IconButton } from "@/components/ui/button";
import { Brand } from "@/features/client/components/brand";
import { cn } from "@/lib/cn";
import { applyTheme, readTheme } from "@/lib/theme";

const links = [
  { label: "How it works", to: `${paths.client.home}#how-it-works` },
  { label: "My requests", to: paths.client.myRequests },
  { label: "Pharmacy sign in", to: paths.auth.signIn },
];

const linkClass = "rounded-full px-3 py-2 text-md font-semibold text-ink-2 transition-colors hover:text-ink";

function ThemeToggle() {
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

export function ClientHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1160px] items-center justify-between gap-4 px-4 sm:h-[68px] sm:px-5">
        <Brand />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((link) =>
            link.to.includes("#") ? (
              <a key={link.label} href={link.to} className={linkClass}>
                {link.label}
              </a>
            ) : (
              <NavLink key={link.label} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ),
          )}
          <ThemeToggle />
          <Link to={`${paths.client.home}#request`} className={cn(buttonStyles({ variant: "primary", size: "lg" }), "ml-2")}>
            Find my medication
          </Link>
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <IconButton label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
            <Icon name={open ? "close" : "menu"} />
          </IconButton>
        </div>
      </div>
      <nav
        aria-label="Mobile"
        className={cn("grid gap-1 border-t border-line px-4 pt-2 pb-4 md:hidden", !open && "hidden")}
      >
        {links.map((link) =>
          link.to.includes("#") ? (
            <a key={link.label} href={link.to} className={linkClass} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ) : (
            <NavLink key={link.label} to={link.to} className={linkClass} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ),
        )}
        <Link
          to={`${paths.client.home}#request`}
          onClick={() => setOpen(false)}
          className={cn(buttonStyles({ variant: "primary", size: "lg" }), "mt-2 w-full")}
        >
          Find my medication
        </Link>
      </nav>
    </header>
  );
}
