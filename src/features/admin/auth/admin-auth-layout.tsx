import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { useDocumentTitle } from "@/lib/use-document-title";

/** Centered card on the brand gradient, for the staff-only admin portal. */
export function AdminAuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  useDocumentTitle(`${title} — FindRx Admin`);
  return (
    <div className="grid min-h-dvh place-items-center bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_45%,#000)_0%,var(--accent)_100%)] px-4 py-10">
      <section key={title} className="modal-in w-full max-w-[440px] rounded-[26px] bg-panel p-6 text-ink shadow-pop sm:p-8">
        <Link
          to={paths.client.home}
          aria-label="FindRx home"
          className="inline-flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <LogoMark />
          <span className="text-xl font-bold tracking-tight">
            <Wordmark /> Admin
          </span>
        </Link>
        <h1 className="mt-6 text-[30px] leading-tight font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-md text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
