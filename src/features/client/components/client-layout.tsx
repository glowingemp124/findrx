import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ClientHeader } from "@/features/client/components/client-header";
import { PhoneWidget } from "@/features/client/components/phone-widget";

/** Public shell for the client side: no account, no sidebar. */
export function ClientLayout() {
  const { pathname, hash } = useLocation();

  // Scroll to in-page anchors like /#request, and to the top on route changes.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <ClientHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-2 px-4 pt-6 pb-20 text-sm text-muted sm:px-5 sm:pb-6">
          <p>© FindRx</p>
          <p>FindRx is an information service, not a pharmacy. No medical advice.</p>
        </div>
      </footer>
      <PhoneWidget />
    </div>
  );
}
