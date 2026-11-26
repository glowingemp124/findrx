import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { useDocumentTitle } from "@/lib/use-document-title";

type PageHeaderProps = {
  title: string;
  subtitle: ReactNode;
  /** Product name for the browser tab, e.g. "FindRx Admin". */
  brand: string;
  /** Link above the title, e.g. back to a list. */
  back?: { to: string; label: string };
  /** Shown beside the title, e.g. a live indicator. */
  adornment?: ReactNode;
  /** Right-hand side, e.g. a status badge. */
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, brand, back, adornment, action }: PageHeaderProps) {
  useDocumentTitle(`${title} — ${brand}`);
  return (
    <header className="rise-in flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {back ? (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1.5 text-md font-semibold text-accent-text hover:underline">
            <Icon name="arrowLeft" className="size-4" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="flex items-center gap-3 text-[clamp(26px,3.4vw,34px)] leading-tight font-bold tracking-[-0.02em]">
          {title}
          {adornment}
        </h1>
        <p className="mt-1 text-md text-muted sm:text-base">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function LiveDot() {
  return (
    <span className="relative flex size-3" aria-label="Live">
      <span className="absolute inset-0 animate-ping rounded-full bg-good opacity-50 motion-reduce:hidden" />
      <span className="relative size-3 rounded-full bg-good ring-4 ring-good-soft" />
    </span>
  );
}
