import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { paths } from "@/app/paths";
import { RequestNotFound } from "@/features/client/components/request-states";
import { useRequest } from "@/features/client/hooks/use-request";
import { pathForView, viewForPhase, type RequestView } from "@/features/client/lib/request-routes";
import type { BlindRequest, RequestPhase } from "@/features/requests/types";

type GateProps = {
  view: RequestView;
  children: (state: { request: BlindRequest; phase: RequestPhase; now: number }) => ReactNode;
};

/** Loads the request from the URL and sends the client to the page that matches its phase. */
export function RequestGate({ view, children }: GateProps) {
  const { requestId } = useParams();
  const { request, phase, now } = useRequest(requestId);

  if (!request || !phase) return <RequestNotFound />;

  const expected = viewForPhase(phase);
  if (expected === null) return <Navigate to={paths.client.home} replace />;
  if (expected !== view) return <Navigate to={pathForView(request.id, expected)} replace />;

  return <>{children({ request, phase, now })}</>;
}
