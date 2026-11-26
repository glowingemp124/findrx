import { useEffect } from "react";
import { resolvePhase } from "@/features/requests/lib/request-phase";
import { requestService } from "@/features/requests/services/request-service";
import { useNow } from "@/lib/use-now";

/** Live view of one request: the record, its derived phase, and a ticking clock. */
export function useRequest(id: string | undefined) {
  const requests = requestService.use();
  const now = useNow(1000);
  const request = id ? requests.find((item) => item.id === id) : undefined;

  useEffect(() => {
    if (id) requestService.sync(id, now);
  }, [id, now]);

  return { request, phase: request ? resolvePhase(request, now) : null, now };
}
