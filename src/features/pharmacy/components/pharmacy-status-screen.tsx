import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AuthLayout } from "@/features/auth/auth-layout";
import { authService } from "@/features/auth/auth-service";
import type { PharmacyStatus, SessionAccount } from "@/features/auth/types";

const COPY: Record<Exclude<PharmacyStatus, "active">, { title: string; body: string }> = {
  pending: {
    title: "We're reviewing your pharmacy",
    body: "FindRx checks every NPI against the national registry before a pharmacy can see requests. This usually takes one business day, and we'll email you when you're live.",
  },
  info_requested: {
    title: "We need a little more information",
    body: "Our team couldn't finish the review yet. Reply to the email we sent with the details below, and we'll pick it up again.",
  },
  rejected: {
    title: "We couldn't approve this pharmacy",
    body: "Your application wasn't approved. If you think this is a mistake, reply to our email and we'll take another look.",
  },
  suspended: {
    title: "Your account is suspended",
    body: "You can't see or claim requests while the account is suspended. Contact FindRx support to resolve it.",
  },
};

/** Shown instead of the dashboard until FindRx has approved the pharmacy. */
export function PharmacyStatusScreen({ account }: { account: SessionAccount }) {
  const navigate = useNavigate();
  const copy = COPY[account.status as Exclude<PharmacyStatus, "active">];

  return (
    <AuthLayout title={copy.title} subtitle={account.pharmacy.name}>
      <div className="grid gap-4">
        <p className="text-md text-ink-2">{copy.body}</p>
        {account.statusNote ? (
          <Notice tone={account.status === "info_requested" ? "warn" : "bad"} icon="mail">
            <strong>Message from FindRx:</strong> {account.statusNote}
          </Notice>
        ) : null}
        <p className="text-sm text-muted">
          Signed in as {account.email}. Questions? support@findrx.example
        </p>
        <Button
          size="lg"
          className="h-12"
          onClick={() => {
            authService.signOut();
            navigate(paths.auth.signIn, { replace: true });
          }}
        >
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}
