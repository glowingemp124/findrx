import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OtpInput } from "@/components/ui/otp-input";
import { RequestCard, RequestHeading, RequestPageFrame } from "@/features/client/components/request-ui";
import { PhoneField, nationalError } from "@/features/client/components/phone-field";
import { formatPhone, samePhone, summarizeMedication } from "@/features/requests/lib/formatters";
import { resolvePhase } from "@/features/requests/lib/request-phase";
import { requestService } from "@/features/requests/services/request-service";
import { smsStore } from "@/features/requests/services/sms-store";
import type { RequestPhase } from "@/features/requests/types";
import { createPersistentStore } from "@/lib/persistent-store";
import { useDocumentTitle } from "@/lib/use-document-title";

const CODE = "123456";
const session = createPersistentStore<string | null>("findrx-patient-session", null, { storage: sessionStorage });

const PHASE_LABEL: Record<RequestPhase, string> = {
  pending_verification: "Not posted",
  live: "Pharmacies are checking",
  no_match: "No pharmacy yet",
  pharmacy_found: "Pharmacy found · pay to connect",
  checkout_expired: "Payment window missed",
  connected: "Connected",
  closed: "Closed",
};

/** Past requests for a phone number. A code is required here, not for a new search. */
export function MyRequestsPage() {
  useDocumentTitle("My requests — FindRx");
  const requests = requestService.use();
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState<string | null>(() => session.get());
  const [error, setError] = useState("");

  const send = (event: FormEvent) => {
    event.preventDefault();
    const problem = nationalError(phone);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setCode("");
    setSentTo(phone.replace(/\D/g, ""));
    smsStore.send(`Your FindRx code is ${CODE}. It expires in 10 minutes.`, { code: CODE });
  };

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    if (code !== CODE) {
      setError("That code doesn't match. Check the text and try again.");
      return;
    }
    setError("");
    setVerified(sentTo);
    session.set(sentTo);
  };

  const logout = () => {
    session.set(null);
    setVerified(null);
    setSentTo(null);
    setPhone("");
    setCode("");
    setError("");
  };

  const mine = verified
    ? requests.filter((request) => samePhone(request.draft.phone, verified) && request.postedAt !== null)
    : [];

  return (
    <RequestPageFrame>
      <RequestCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <RequestHeading title="My requests">
            A new search doesn't need a code. Enter the mobile number you used, then the texted code, to see requests already posted.
          </RequestHeading>
          {verified ? (
            <Button onClick={logout}>Log out</Button>
          ) : null}
        </div>

        {verified ? (
          mine.length === 0 ? (
            <p className="text-md text-muted">No requests for {formatPhone(verified)} yet. Log out to try another number.</p>
          ) : (
            <ul className="grid gap-3">
              {mine
                .slice()
                .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0))
                .map((request) => {
                  const phase = resolvePhase(request, Date.now());
                  return (
                    <li key={request.id}>
                      <Link
                        to={paths.client.request(request.id)}
                        className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 ring-1 ring-line-strong transition-colors hover:bg-side-hover"
                      >
                        <span>
                          <span className="block font-semibold">{summarizeMedication(request)}</span>
                          <span className="text-sm text-muted">
                            {request.reference} · {request.draft.area}
                          </span>
                        </span>
                        <Badge tone={phase === "connected" ? "good" : phase === "live" || phase === "pharmacy_found" ? "accent" : "muted"}>
                          {PHASE_LABEL[phase]}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          )
        ) : sentTo ? (
          <form noValidate onSubmit={confirm} className="grid gap-4">
            <p className="text-md text-ink-2">We texted a code to {formatPhone(sentTo)}.</p>
            <OtpInput value={code} onChange={setCode} />
            {error ? <p className="text-sm font-semibold text-bad">{error}</p> : null}
            <Button type="submit" variant="primary" size="lg">
              Show my requests
            </Button>
            <Button
              onClick={() => {
                setSentTo(null);
                setCode("");
                setError("");
              }}
            >
              Use a different number
            </Button>
          </form>
        ) : (
          <form noValidate onSubmit={send} className="grid gap-4">
            <PhoneField label="Mobile number" value={phone} error={error} onChange={setPhone} />
            <Button type="submit" variant="primary" size="lg">
              Text me a code
            </Button>
          </form>
        )}
      </RequestCard>
    </RequestPageFrame>
  );
}
