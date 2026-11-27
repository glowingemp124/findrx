import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { ClientHeader } from "@/features/client/components/client-header";
import { PhoneWidget } from "@/features/client/components/phone-widget";
import { Sheet } from "@/components/ui/sheet";
import { LegalDocument } from "@/components/ui/legal-document";
import { platformSettings } from "@/features/platform/platform-settings";

/** Public shell for the client side: no account, no sidebar. */
export function ClientLayout() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { privacyText, termsText } = platformSettings.use();
  const fromPath = pathname === paths.client.privacy ? "privacy" : pathname === paths.client.terms ? "terms" : null;
  const [picked, setPicked] = useState<"privacy" | "terms" | null>(null);
  const doc = picked ?? fromPath;

  // Scroll to in-page anchors like /#request, and to the top on route changes.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  const closeLegal = () => {
    setPicked(null);
    if (fromPath) navigate(paths.client.home);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <ClientHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 pt-6 pb-20 text-sm text-muted sm:px-5 sm:pb-6">
          <p>© FindRx</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            <button type="button" className="cursor-pointer font-semibold hover:text-ink" onClick={() => setPicked("privacy")}>
              Privacy Policy
            </button>
            <button type="button" className="cursor-pointer font-semibold hover:text-ink" onClick={() => setPicked("terms")}>
              Terms & Conditions
            </button>
          </nav>
          <p>FindRx is an information service, not a pharmacy. No medical advice.</p>
        </div>
      </footer>
      <Sheet open={doc !== null} title={doc === "terms" ? "Terms & Conditions" : "Privacy Policy"} onClose={closeLegal}>
        <LegalDocument bare text={doc === "terms" ? termsText : privacyText} />
      </Sheet>
      <PhoneWidget />
    </div>
  );
}
