import { useState, type FormEvent } from "react";
import { buttonStyles, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/icons";
import { formatCountdown, formatUsPhone, usDigits } from "@/features/requests/lib/formatters";
import type { ClaimView } from "@/features/pharmacy/lib/claims";
import { claimLedger } from "@/features/pharmacy/services/claim-ledger";
import { disputeStore } from "@/features/requests/services/dispute-store";
import { cn } from "@/lib/cn";

const fulfilmentText = (view: ClaimView) =>
  view.fulfilment === "delivery" ? "Delivery requested" : view.fulfilment === "pickup" ? "Pickup" : null;

function Summary({ view, muted = false }: { view: ClaimView; muted?: boolean }) {
  const line = [view.details, fulfilmentText(view)].filter(Boolean).join(" · ");
  return (
    <div className={cn("min-w-0", muted && "text-muted")}>
      <h2 className="text-xl font-bold tracking-tight">{view.medication}</h2>
      {line ? <p className={cn("mt-0.5 text-md", muted ? "text-muted" : "text-ink-2")}>{line}</p> : null}
    </div>
  );
}

export function AwaitingClaimCard({ view, now }: { view: ClaimView; now: number }) {
  return (
    <article className="card rise-in flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <Summary view={view} />
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <Badge tone="warn">Waiting for the patient</Badge>
        <p className="text-xl font-bold tabular-nums" role="timer" aria-label="Time left for the patient to connect">
          {formatCountdown(view.payBy - now)}
        </p>
      </div>
    </article>
  );
}

export function PaidClaimCard({ view }: { view: ClaimView }) {
  const { entry, patient } = view;
  return (
    <article className="card rise-in grid gap-4 p-4 ring-1 ring-good/30 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Summary view={view} />
        <Badge tone="good">Connected</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid content-start gap-2 rounded-[16px] p-4 ring-1 ring-line-strong">
          <p className="text-sm text-muted">Patient</p>
          {patient ? (
            <>
              <p className="text-2xl font-bold tracking-tight">{patient.name || "Name not given"}</p>
              <a href={`tel:+1${usDigits(patient.phone)}`} className={cn(buttonStyles({ variant: "primary", size: "lg" }), "justify-self-start")}>
                <Icon name="phone" className="size-4" />
                Call {formatUsPhone(patient.phone)}
              </a>
            </>
          ) : (
            <p className="text-md text-muted">Patient details aren't on this claim.</p>
          )}
        </div>
        <p className="rounded-[16px] bg-accent-soft p-4 text-md text-accent-text">
          Confirm the prescription, price and insurance by phone.
          {view.fulfilment === "delivery" ? (
            <>
              {" "}
              They asked for <strong>delivery</strong>: agree it and any fee with them.
            </>
          ) : null}{" "}
          Their details stay on the claim so your team can follow up.
        </p>
      </div>
      <Checkbox checked={entry.contactedAt !== null} onChange={(checked) => claimLedger.setContacted(entry.id, checked)}>
        Contacted <span className="text-muted">(a note for your team)</span>
      </Checkbox>
      <DisputeReply requestId={entry.requestId} />
    </article>
  );
}

function DisputeReply({ requestId }: { requestId: string }) {
  const disputes = disputeStore.use();
  const dispute = disputes.find((item) => item.requestId === requestId);
  const [note, setNote] = useState("");
  if (!dispute) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 4) return;
    disputeStore.respond(dispute.id, note);
    setNote("");
  };

  return (
    <div className="grid gap-2 rounded-[16px] bg-warn-soft p-4">
      <p className="text-sm font-semibold text-warn">The patient says this wasn't furnished</p>
      <p className="text-md text-ink">{dispute.patientNote}</p>
      {dispute.status !== "open" ? (
        <p className="text-sm text-muted">FindRx {dispute.status === "refunded" ? "refunded the patient" : "closed this report"}.</p>
      ) : dispute.pharmacyNote ? (
        <p className="text-sm text-ink-2">Your reply: {dispute.pharmacyNote}</p>
      ) : (
        <form onSubmit={submit} className="grid gap-2">
          <Textarea label="What happened" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" variant="primary" disabled={note.trim().length < 4}>
            Send reply
          </Button>
        </form>
      )}
    </div>
  );
}

export function ExpiredClaimCard({ view }: { view: ClaimView }) {
  return (
    <article className="rise-in flex flex-col gap-3 rounded-[20px] bg-side-well p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <Summary view={view} muted />
      <Badge tone="muted">Patient didn't connect in 1 hour · released</Badge>
    </article>
  );
}
