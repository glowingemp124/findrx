import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import { useDocumentTitle } from "@/lib/use-document-title";

const BENEFITS = [
  "Free to join. No subscription.",
  "See anonymous requests in real time.",
  "Claim only what's on your shelf, first come, first served.",
  "Get the patient's name and number once they pay FindRx's fee.",
];

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="size-9" />
      <span className="text-xl font-bold tracking-tight">
        {inverted ? "FindRx" : <Wordmark />} <span className="font-medium opacity-75">for Pharmacies</span>
      </span>
    </span>
  );
}

type AuthLayoutProps = {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  /** Optional line above the title, e.g. "Step 1 of 2". */
  eyebrow?: string;
};

/** Split screen: the pitch on the left (wide screens only), the form on the right. */
export function AuthLayout({ title, subtitle, eyebrow, children }: AuthLayoutProps) {
  useDocumentTitle(`${title} — FindRx for Pharmacies`);

  return (
    <div className="grid min-h-dvh bg-canvas text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(165deg,color-mix(in_oklab,var(--accent)_55%,#000)_0%,var(--accent)_100%)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="flex items-center justify-between gap-4">
          <BrandMark inverted />
          <Link to={paths.client.home} className="flex items-center gap-1.5 text-md font-semibold text-white/85 hover:text-white">
            <Icon name="arrowLeft" className="size-4" />
            FindRx for patients
          </Link>
        </div>
        <div className="max-w-[540px]">
          <h2 className="rise-in text-[clamp(32px,3.2vw,46px)] leading-[1.08] font-bold tracking-[-0.02em]">
            Patients near you are looking for medication you already stock.
          </h2>
          <ul className="mt-8 grid gap-4">
            {BENEFITS.map((benefit, index) => (
              <li
                key={benefit}
                className="rise-in flex items-start gap-3 text-lg text-white/90"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/15">
                  <Icon name="check" className="size-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="max-w-[520px] text-sm text-white/70">
          FindRx is an information service. Prescriptions, insurance and payment for medication stay between you and the
          patient.
        </p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <BrandMark />
          <Link to={paths.client.home} className="text-sm font-semibold text-muted hover:text-ink">
            For patients
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div key={title} className="rise-in w-full max-w-[420px]">
            {eyebrow ? <p className="mb-2 text-sm font-semibold text-accent-text">{eyebrow}</p> : null}
            <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-md text-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Form-level error under the fields. */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex gap-2 rounded-[12px] bg-bad-soft px-3.5 py-2.5 text-md text-bad">
      <Icon name="alert" className="mt-0.5 size-4" />
      {message}
    </p>
  );
}
