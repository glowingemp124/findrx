import { PaymentPanel } from "@/features/client/components/payment-panel";
import { RequestGate } from "@/features/client/components/request-gate";
import { Badge } from "@/components/ui/badge";
import {
  Countdown,
  DetailList,
  RequestCard,
  RequestHeading,
  RequestPageFrame,
  RequestStepper,
} from "@/features/client/components/request-ui";
import { clientConfig } from "@/features/requests/config";
import { formatCountdown, formatDistanceBand, formatUsd, summarizeMedication } from "@/features/requests/lib/formatters";
import { requestFee } from "@/features/requests/services/request-service";
import { useDocumentTitle } from "@/lib/use-document-title";

export function PayPage() {
  useDocumentTitle("Pharmacy found — FindRx");

  return (
    <RequestGate view="pay">
      {({ request, now }) => {
        const claim = request.claim!;
        const fee = requestFee(request);
        const delivery = request.draft.fulfilment === "delivery";
        return (
          <RequestPageFrame>
            <RequestStepper steps={["Request posted", "Pharmacy found", "Pay", "Connect"]} current={2} />
            <RequestCard>
              <Badge tone="good">Pharmacy found · {request.reference}</Badge>
              <RequestHeading title={`A pharmacy ${formatDistanceBand(claim.distanceBand)} away has your medication`}>
                Pay the FindRx fee to get its name, address and phone. They'll get your name and number at the same
                moment.
              </RequestHeading>
              <Countdown
                tone="accent"
                label="Time left to pay"
                value={formatCountdown(claim.claimedAt + clientConfig.checkoutWindowMs - now)}
                note="After this, the pharmacy is released and nothing is charged."
              />
              <DetailList
                rows={[
                  ["Medication", summarizeMedication(request)],
                  ["How to get it", delivery ? "Delivery requested · agree with the pharmacy" : "Pickup at the pharmacy"],
                  ["Request", request.reference],
                ]}
              />
              <hr className="border-line" />
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-semibold">FindRx fee</h2>
                  <p className="text-xl font-bold tabular-nums">{formatUsd(fee)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  One flat fee for the introduction. The medication, any delivery and insurance are paid to the pharmacy
                  directly.
                </p>
              </div>
              <PaymentPanel requestId={request.id} feeCents={fee} />
            </RequestCard>
          </RequestPageFrame>
        );
      }}
    </RequestGate>
  );
}
