import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { formatUsd } from "@/features/requests/lib/formatters";
import {
  formatCardNumber,
  formatExpiry,
  validateCard,
  type CardErrors,
  type CardInput,
} from "@/features/client/lib/validate-payment";
import type { PaymentMethod } from "@/features/requests/services/payment-gateway";
import { requestService, type PayResult } from "@/features/requests/services/request-service";

const FAILURES: Record<Exclude<PayResult, { ok: true }>["reason"], string> = {
  declined: "Your card was declined and nothing was charged. Try another card, or pay with Apple Pay or Google Pay.",
  unavailable: "This checkout is no longer open, so nothing was charged.",
};

const emptyCard: CardInput = { email: "", number: "", expiry: "", cvc: "" };

export function PaymentPanel({ requestId, feeCents }: { requestId: string; feeCents: number }) {
  const [card, setCard] = useState(emptyCard);
  const [errors, setErrors] = useState<CardErrors>({});
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [failure, setFailure] = useState("");
  const [paying, setPaying] = useState(false);

  const edit = (changes: Partial<CardInput>) => {
    setCard((current) => ({ ...current, ...changes }));
    setFailure("");
  };

  const pay = async (method: PaymentMethod, receiptEmail: string) => {
    if (!agreed) {
      setTermsError(true);
      return;
    }
    setPaying(true);
    setFailure("");
    const result = await requestService.pay(requestId, method, receiptEmail);
    // On success the request moves to "connected" and the page redirects itself.
    if (!result.ok) {
      setFailure(FAILURES[result.reason]);
      setPaying(false);
    }
  };

  const submitCard = (event: FormEvent) => {
    event.preventDefault();
    const next = validateCard(card);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (!agreed) setTermsError(true);
      return;
    }
    void pay({ kind: "card", number: card.number }, card.email.trim());
  };

  const fee = formatUsd(feeCents);

  return (
    <form noValidate onSubmit={submitCard} className="grid gap-5">
      <div className="grid gap-4 rounded-[18px] bg-side-well p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-md font-bold">Payment</h2>
          <span className="text-sm text-muted">Secured by Stripe</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button variant="ink" size="lg" disabled={paying} onClick={() => void pay({ kind: "wallet", provider: "apple" }, "")}>
            Apple Pay
          </Button>
          <Button size="lg" disabled={paying} onClick={() => void pay({ kind: "wallet", provider: "google" }, "")}>
            Google Pay
          </Button>
        </div>
        <p className="text-center text-sm text-muted">or pay by card</p>
        <TextField
          label="Email for your receipt"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={card.email}
          error={errors.email}
          onChange={(event) => edit({ email: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_120px_100px]">
          <TextField
            fieldClassName="col-span-2 sm:col-span-1"
            label="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={card.number}
            error={errors.number}
            onChange={(event) => edit({ number: formatCardNumber(event.target.value) })}
          />
          <TextField
            label="Expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={card.expiry}
            error={errors.expiry}
            onChange={(event) => edit({ expiry: formatExpiry(event.target.value) })}
          />
          <TextField
            label="CVC"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={card.cvc}
            error={errors.cvc}
            onChange={(event) => edit({ cvc: event.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </div>
        <p className="text-xs text-muted">
          Test mode: any valid test card such as 4242 4242 4242 4242 succeeds. Use 4000 0000 0000 0002 to see a declined
          card. Wallet buttons always succeed.
        </p>
      </div>

      <Checkbox
        boxed
        checked={agreed}
        error={termsError ? "Agree to the terms to continue." : undefined}
        onChange={(checked) => {
          setAgreed(checked);
          setTermsError(false);
        }}
      >
          I agree to the{" "}
          <Link to={paths.client.terms} target="_blank" className="font-semibold text-accent-text underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          and understand that <strong className="text-ink">FindRx is only an information service</strong>: it doesn't
          guarantee the pharmacy's stock, isn't responsible for its prices or any delivery fees, and my prescription must be
          checked directly with the pharmacy.
      </Checkbox>

      {failure ? <Notice tone="bad">{failure}</Notice> : null}

      <Button type="submit" variant="primary" size="lg" disabled={paying} className="h-auto min-h-12 w-full py-2.5 text-lg whitespace-normal">
        {paying ? "Processing…" : `Pay ${fee} and get pharmacy details`}
      </Button>
    </form>
  );
}
