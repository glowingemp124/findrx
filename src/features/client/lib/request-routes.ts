import { paths } from "@/app/paths";
import type { RequestPhase } from "@/features/requests/types";

export type RequestView = "status" | "pay" | "connected";

/** Which page a request in a given phase belongs on. Pages redirect when they don't match. */
export function viewForPhase(phase: RequestPhase): RequestView | null {
  switch (phase) {
    case "pending_verification":
      return null;
    case "pharmacy_found":
      return "pay";
    case "connected":
      return "connected";
    default:
      return "status";
  }
}

export function pathForView(id: string, view: RequestView) {
  return view === "pay" ? paths.client.pay(id) : view === "connected" ? paths.client.connected(id) : paths.client.request(id);
}
