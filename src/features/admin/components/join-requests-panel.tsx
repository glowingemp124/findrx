import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { authService } from "@/features/auth/auth-service";
import { joinRequests } from "@/features/auth/join-requests";
import { useToast } from "@/lib/toast";

const dateFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

/** Applications that are not accounts until FindRx visits and creates a sign-in. */
export function JoinRequestsPanel() {
  const requests = joinRequests.use();
  const open = requests.filter((item) => item.status === "new");
  const { push } = useToast();
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  if (open.length === 0 && !issued) return null;

  return (
    <Panel title="Join requests" subtitle="Not accounts yet. Visit the pharmacy, then create the sign-in.">
      <div className="grid gap-3">
        {issued ? (
          <Notice tone="accent">
            Sign-in created for {issued.email}. Temporary password: <strong className="font-semibold">{issued.password}</strong>. Share it in person.
          </Notice>
        ) : null}
        {open.map((request) => (
          <article key={request.id} className="grid gap-2 rounded-[14px] p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">{request.pharmacy.name}</h3>
              <p className="text-sm text-muted">{dateFormat.format(request.submittedAt)}</p>
            </div>
            <p className="text-md text-ink-2">
              {request.contactName}
              {request.contactTitle ? `, ${request.contactTitle}` : ""} · {request.email} · {request.pharmacy.phone}
            </p>
            <p className="text-md text-ink-2">
              {request.pharmacy.street}, {request.pharmacy.city}, {request.pharmacy.state} {request.pharmacy.zip} · NPI {request.pharmacy.npi}
              {request.pharmacy.canCompound ? " · Compounds" : ""}
            </p>
            {request.note ? <p className="text-md text-muted">{request.note}</p> : null}
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  const password = temporaryPassword();
                  const result = authService.createPharmacy({
                    email: request.email,
                    password,
                    contactName: request.contactName,
                    contactTitle: request.contactTitle,
                    pharmacy: request.pharmacy,
                  });
                  if (!result.ok) {
                    push(result.error, { tone: "error" });
                    return;
                  }
                  joinRequests.mark(request.id, "approved");
                  setIssued({ email: request.email, password });
                }}
              >
                Create sign-in after visit
              </Button>
              <Button
                onClick={() => {
                  joinRequests.mark(request.id, "declined");
                  push("Request declined.");
                }}
              >
                Decline
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
