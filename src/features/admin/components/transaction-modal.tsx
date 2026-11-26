import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { platformSettings } from "@/features/platform/platform-settings";
import { formatDistanceBand, formatUsd, formatUsPhone, usDigits } from "@/features/requests/lib/formatters";
import { formatPaymentMethod } from "@/features/requests/services/payment-gateway";
import { REFUND_REASONS, transactionStore, type RefundReason, type Transaction } from "@/features/requests/services/transaction-store";
import type { BlindRequest } from "@/features/requests/types";
import { useToast } from "@/lib/toast";

const timeFormat = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const minutes = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} min`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
      {/* One grid per section: the label column fits the longest label, values get the rest. */}
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-5 gap-y-2 rounded-[16px] bg-side-well px-4 py-3.5 text-md">
        {children}
      </dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 font-medium break-words text-ink">{children}</dd>
    </div>
  );
}

type TransactionModalProps = {
  transaction: Transaction | null;
  request: BlindRequest | undefined;
  canRefund: boolean;
  adminName: string;
  onClose: () => void;
};

export function TransactionModal({ transaction, request, canRefund, adminName, onClose }: TransactionModalProps) {
  const { push } = useToast();
  const [refunding, setRefunding] = useState(false);
  const [reason, setReason] = useState<RefundReason>("pharmacy_out_of_stock");
  const [note, setNote] = useState("");
  const retentionMs = platformSettings.use().retentionHours * 60 * 60_000;

  const close = () => {
    setRefunding(false);
    setNote("");
    onClose();
  };

  if (!transaction) return <Modal open={false} title="" onClose={close} />;
  const t = transaction;
  const visibleUntil = t.paidAt + retentionMs;

  const refund = () => {
    transactionStore.refund(t.id, reason, note, adminName);
    setRefunding(false);
    push(`${t.id} refunded`, { description: `${formatUsd(t.amountCents)} goes back to the patient's card.` });
  };

  return (
    <Modal open wide title={t.id} description={`${t.medication} · ${t.pharmacyName}`} onClose={close}>
      <div className="grid gap-4 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={t.status === "paid" ? "good" : "warn"}>{t.status === "paid" ? "Paid" : "Refunded"}</Badge>
          <span className="text-2xl font-bold tabular-nums">{formatUsd(t.amountCents)}</span>
          <span className="text-md text-muted">· {timeFormat.format(t.paidAt)}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Section title="Payment">
            <Row label="Method">{formatPaymentMethod(t.method)}</Row>
            <Row label="Stripe">
              <span className="flex min-w-0 items-start gap-1">
                <span className="min-w-0 font-mono text-[12.5px] leading-6 break-all">{t.stripePaymentId}</span>
                <CopyButton value={t.stripePaymentId} label="Stripe payment ID" className="-my-1 shrink-0" />
              </span>
            </Row>
            <Row label="Receipt">{t.receiptEmail || "Sent by the wallet provider"}</Row>
          </Section>
          <Section title="Patient (Searcher)">
            {request ? (
              <>
                <Row label="Name">{request.draft.fullName.trim()}</Row>
                <Row label="Phone">
                  <span className="flex items-center gap-1">
                    <a href={`tel:+1${usDigits(request.draft.phone)}`} className="tabular-nums text-accent-text hover:underline">
                      {formatUsPhone(request.draft.phone)}
                    </a>
                    <CopyButton value={formatUsPhone(request.draft.phone)} label="patient phone" className="-my-1 shrink-0" />
                  </span>
                </Row>
                <Row label="Visible until">{timeFormat.format(visibleUntil)}</Row>
              </>
            ) : (
              <Row label="Details">Deleted in the daily purge</Row>
            )}
            <Row label="Request">{t.reference}</Row>
          </Section>
          <Section title="Request">
            <Row label="Medication">{t.medication}</Row>
            <Row label="How to get it">{t.fulfilment === "delivery" ? "Delivery requested" : "Pickup"}</Row>
            <Row label="Compounding">{t.needsCompounding ? "Needed" : "Not needed"}</Row>
            <Row label="Search area">Within {t.radiusMiles} miles</Row>
          </Section>
          <Section title="Pharmacy">
            <Row label="Name">{t.pharmacyName}</Row>
            <Row label="Address">{t.pharmacyAddress}</Row>
            <Row label="Distance">{formatDistanceBand(t.distanceBand)}</Row>
            <Row label="Time to claim">{minutes(t.timeToClaimMs)}</Row>
            <Row label="Time to pay">{minutes(t.timeToPayMs)}</Row>
          </Section>
        </div>

        {t.refund ? (
          <Notice tone="warn" icon="refresh">
            Refunded by {t.refund.by} on {timeFormat.format(t.refund.at)} ·{" "}
            {REFUND_REASONS.find((item) => item.value === t.refund!.reason)?.label}
            {t.refund.note ? ` · "${t.refund.note}"` : ""}
          </Notice>
        ) : canRefund ? (
          refunding ? (
            <section className="modal-in grid gap-4 rounded-[18px] p-4 ring-1 ring-bad/40">
              <div>
                <h3 className="text-lg font-bold">Refund {t.id}?</h3>
                <p className="text-md text-muted">The full fee goes back to the patient's card through Stripe. This cannot be undone.</p>
              </div>
              <Select label="Reason" value={reason} options={REFUND_REASONS} onChange={setReason} />
              <Textarea label="Note (optional)" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
              <div className="flex flex-wrap gap-2.5">
                <Button size="lg" className="text-bad ring-bad/40" onClick={refund}>
                  Refund {formatUsd(t.amountCents)}
                </Button>
                <Button size="lg" onClick={() => setRefunding(false)}>
                  Cancel
                </Button>
              </div>
            </section>
          ) : (
            <Button size="lg" className="text-bad ring-bad/40" onClick={() => setRefunding(true)}>
              Refund this payment
            </Button>
          )
        ) : (
          <p className="text-sm text-muted">You need the Refunds permission to refund payments.</p>
        )}
      </div>
    </Modal>
  );
}
