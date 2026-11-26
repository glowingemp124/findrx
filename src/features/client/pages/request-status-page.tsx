import { RequestGate } from "@/features/client/components/request-gate";
import {
  CheckoutClosed,
  ClosedRequest,
  LiveRequest,
  NoMatchRequest,
} from "@/features/client/components/request-states";
import { RequestPageFrame, RequestStepper } from "@/features/client/components/request-ui";
import { useDocumentTitle } from "@/lib/use-document-title";

export function RequestStatusPage() {
  useDocumentTitle("Your Blind Request — FindRx");

  return (
    <RequestGate view="status">
      {({ request, phase, now }) => (
        <RequestPageFrame>
          {phase === "live" || phase === "no_match" ? (
            <RequestStepper steps={["Request posted", "Finding a pharmacy", "Pay", "Connect"]} current={1} />
          ) : null}
          {phase === "live" ? <LiveRequest request={request} now={now} /> : null}
          {phase === "no_match" ? <NoMatchRequest request={request} /> : null}
          {phase === "checkout_expired" ? <CheckoutClosed request={request} /> : null}
          {phase === "closed" ? <ClosedRequest request={request} /> : null}
        </RequestPageFrame>
      )}
    </RequestGate>
  );
}
