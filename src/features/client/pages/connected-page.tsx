import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Icon } from "@/components/icons";
import { Button, buttonStyles } from "@/components/ui/button";
import { RequestGate } from "@/features/client/components/request-gate";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import {
  DetailList,
  RequestCard,
  RequestHeading,
  RequestPageFrame,
  RequestStepper,
} from "@/features/client/components/request-ui";
import { summarizeMedication, usDigits } from "@/features/requests/lib/formatters";
import { useDocumentTitle } from "@/lib/use-document-title";

/** Decorative map tile. A real map (with the pharmacy's coordinates) replaces it with the maps integration. */
function MapPreview() {
  return (
    <div
      aria-hidden
      className="relative h-44 overflow-hidden rounded-[14px] bg-side-well [background-image:linear-gradient(var(--line-2)_1px,transparent_1px),linear-gradient(90deg,var(--line-2)_1px,transparent_1px)] [background-size:44px_44px]"
    >
      <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-accent text-accent-ink shadow-pop">
        <Icon name="mapPin" className="size-5" />
      </span>
    </div>
  );
}

export function ConnectedPage() {
  useDocumentTitle("You're connected — FindRx");
  const navigate = useNavigate();

  return (
    <RequestGate view="connected">
      {({ request }) => {
        const { pharmacy } = request.claim!;
        const payment = request.payment!;
        const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pharmacy.address)}`;
        return (
          <RequestPageFrame>
            <RequestStepper steps={["Request posted", "Pharmacy found", "Paid", "Connect"]} current={4} />
            <RequestCard>
              <span className="grid size-14 place-items-center rounded-full bg-good-soft text-good">
                <Icon name="check" className="size-7" />
              </span>
              <RequestHeading title="You're connected">
                We've also texted these details to you. The pharmacy has your name and number and may call you.
              </RequestHeading>

              <section aria-label="Pharmacy" className="grid gap-4 rounded-[18px] p-4 ring-1 ring-line-strong sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-2xl font-bold tracking-tight">{pharmacy.name}</h2>
                  <Badge tone="good">Confirmed in stock</Badge>
                </div>
                <p className="text-md">{pharmacy.address}</p>
                <div className="flex flex-wrap gap-2.5">
                  <a href={`tel:+1${usDigits(pharmacy.phone)}`} className={buttonStyles({ variant: "primary", size: "lg" })}>
                    <Icon name="phone" className="size-4" />
                    Call {pharmacy.phone}
                  </a>
                  <a href={directions} target="_blank" rel="noreferrer" className={buttonStyles({ size: "lg" })}>
                    <Icon name="navigation" className="size-4" />
                    Get directions
                  </a>
                </div>
                <MapPreview />
              </section>

              <DetailList
                rows={[
                  ["Transaction ID", payment.transactionId],
                  ["Medication", summarizeMedication(request)],
                  ["Receipt", payment.receiptEmail ? `Emailed to ${payment.receiptEmail}` : "Sent by your wallet provider"],
                ]}
              />

              <Notice tone="warn">
                Please confirm the price, your insurance and your prescription with the pharmacy directly.
                {request.draft.fulfilment === "delivery"
                  ? " You asked for delivery, so agree any delivery and its fee with them."
                  : null}
              </Notice>

              <p className="text-md text-muted">
                If the pharmacy didn't actually have it, contact FindRx support with your Transaction ID and we'll review a
                refund. Your request details are deleted 24 hours from now.
              </p>

              <div>
                <Button size="lg" onClick={() => navigate(`${paths.client.home}#request`)}>
                  Find another medication
                </Button>
              </div>
            </RequestCard>
          </RequestPageFrame>
        );
      }}
    </RequestGate>
  );
}
