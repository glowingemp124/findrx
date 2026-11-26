import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import {
  Countdown,
  DetailList,
  RequestCard,
  RequestHeading,
  RequestPageFrame,
} from "@/features/client/components/request-ui";
import { clientConfig } from "@/features/requests/config";
import {
  formatCountdown,
  fulfilmentLabel,
  genericLabel,
  summarizeMedication,
} from "@/features/requests/lib/formatters";
import { draftStore } from "@/features/client/services/draft-store";
import { requestService } from "@/features/requests/services/request-service";
import { platformSettings } from "@/features/platform/platform-settings";
import type { BlindRequest } from "@/features/requests/types";

const areaSummary = (request: BlindRequest) => `${request.draft.area} · ${request.draft.radiusMiles} miles`;

function StartOver({ label = "Find a medication" }: { label?: string }) {
  const navigate = useNavigate();
  return (
    <div>
      <Button variant="primary" size="lg" onClick={() => navigate(`${paths.client.home}#request`)}>
        {label}
      </Button>
    </div>
  );
}

export function RequestNotFound() {
  return (
    <RequestPageFrame>
      <RequestCard>
        <Badge tone="muted">Link expired</Badge>
        <RequestHeading title="This request is no longer available">
          Requests are deleted 24 hours after they close. If you didn't pay, nothing was charged.
        </RequestHeading>
        <StartOver label="Start a new request" />
      </RequestCard>
    </RequestPageFrame>
  );
}

export function LiveRequest({ request, now }: { request: BlindRequest; now: number }) {
  const { draft } = request;
  return (
    <RequestCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone="accent" pulse>
          Live · {request.reference}
        </Badge>
        <Badge tone="good">No charge unless found</Badge>
      </div>
      <RequestHeading title="Your Blind Request is live">
        We've sent it to <strong>{request.notifiedPharmacies}</strong> participating pharmacies within{" "}
        <strong>{draft.radiusMiles} miles</strong> of <strong>{draft.area}</strong>. We'll text you as soon as one confirms
        it has it.
      </RequestHeading>
      <Countdown
        label="Time in queue"
        value={formatCountdown(now - (request.postedAt ?? now))}
        note={`If no pharmacy confirms within ${clientConfig.queueWindowMs / 60_000} minutes, we'll text you to search a wider area or close it at no charge.`}
      />
      <hr className="border-line" />
      <div className="grid gap-4">
        <h2 className="text-xl font-bold tracking-tight">What pharmacies see</h2>
        <DetailList
          rows={[
            ["Medication", summarizeMedication(request)],
            ["Generic OK", genericLabel(draft.genericPreference)],
            ["Manufacturer", draft.manufacturer.trim() || "No preference"],
            ["Compounding", draft.needsCompounding ? "Needed" : "Not needed"],
            ["How to get it", fulfilmentLabel(draft.fulfilment)],
            ["Distance shown", "A band only, never your address"],
            ["Name and phone", "Hidden until you pay"],
          ]}
        />
      </div>
      <Notice tone="accent">Your name and number are hidden. You can close this page; everything continues by text.</Notice>
    </RequestCard>
  );
}

export function NoMatchRequest({ request }: { request: BlindRequest }) {
  const wider = platformSettings.use().searchRadii.filter((radius) => radius > request.draft.radiusMiles);
  const [radius, setRadius] = useState(wider[0] ?? null);

  return (
    <RequestCard>
      <Badge tone="warn">No match yet · {request.reference}</Badge>
      <RequestHeading title="No pharmacy has confirmed it yet">
        None of the {request.notifiedPharmacies} pharmacies within {request.draft.radiusMiles} miles has confirmed in the
        last {clientConfig.queueWindowMs / 60_000} minutes. Nothing has been charged.
      </RequestHeading>
      <DetailList
        rows={[
          ["Medication", summarizeMedication(request)],
          ["Area", areaSummary(request)],
        ]}
      />
      {radius !== null ? (
        <div className="grid gap-3 rounded-[16px] bg-side-well p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Select
            label="Search a wider area"
            value={radius}
            options={wider.map((value) => ({ value, label: `Within ${value} miles` }))}
            onChange={setRadius}
          />
          <Button variant="primary" size="lg" onClick={() => requestService.widenSearch(request.id, radius)}>
            Search wider
          </Button>
        </div>
      ) : (
        <Notice tone="warn">You're already searching the widest area we cover.</Notice>
      )}
      <div>
        <Button size="lg" onClick={() => requestService.close(request.id)}>
          Close request at no charge
        </Button>
      </div>
    </RequestCard>
  );
}

export function CheckoutClosed({ request }: { request: BlindRequest }) {
  const navigate = useNavigate();

  const editAndRepost = () => {
    draftStore.replace(request.draft);
    requestService.close(request.id);
    navigate(`${paths.client.home}#request`);
  };

  return (
    <RequestCard>
      <Badge tone="warn">Checkout window closed</Badge>
      <RequestHeading title="Your checkout window closed">
        Nothing was charged and the pharmacy was released. Still need it? Repost the same Blind Request in one tap, or change
        something first.
      </RequestHeading>
      <DetailList
        rows={[
          ["Medication", summarizeMedication(request)],
          ["Area", areaSummary(request)],
          ["Request", request.reference],
        ]}
      />
      <div className="flex flex-wrap gap-2.5">
        <Button variant="primary" size="lg" onClick={() => requestService.repost(request.id)}>
          Repost request
        </Button>
        <Button size="lg" onClick={editAndRepost}>
          Edit and repost
        </Button>
      </div>
      <p className="text-sm text-muted">This link works for 24 hours. After that, start a new request.</p>
    </RequestCard>
  );
}

export function ClosedRequest({ request }: { request: BlindRequest }) {
  return (
    <RequestCard>
      <Badge tone="muted">Closed · {request.reference}</Badge>
      <RequestHeading title="Your request is closed">
        Nothing was charged. Your request details are deleted 24 hours after closing.
      </RequestHeading>
      <StartOver />
    </RequestCard>
  );
}
