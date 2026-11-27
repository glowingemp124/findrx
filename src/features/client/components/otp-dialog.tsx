import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { OtpInput } from "@/components/ui/otp-input";
import { formatUsPhone } from "@/features/requests/lib/formatters";
import { requestService, type VerifyResult } from "@/features/requests/services/request-service";

const ERRORS: Record<Exclude<VerifyResult, { ok: true }>["reason"], string> = {
  wrong_code: "That code doesn't match. Check the text and try again.",
  expired: "That code has expired. Send a new one.",
  not_found: "This request has expired. Close this and post it again.",
};

type OtpDialogProps = {
  requestId: string | null;
  phone: string;
  onClose: () => void;
  onVerified: (requestId: string) => void;
};

export function OtpDialog({ requestId, phone, onClose, onVerified }: OtpDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  const close = () => {
    setCode("");
    setError("");
    setResent(false);
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!requestId) return;
    if (code.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }
    const result = requestService.verify(requestId, code);
    if (!result.ok) {
      setError(ERRORS[result.reason]);
      return;
    }
    onVerified(requestId);
  };

  const resend = () => {
    if (!requestId) return;
    requestService.resendCode(requestId);
    setCode("");
    setError("");
    setResent(true);
  };

  return (
    <Modal
      narrow
      open={requestId !== null}
      onClose={close}
      title="Check your phone"
      description={`We texted a 6-digit code to ${formatUsPhone(phone)}. It confirms the number is yours.`}
    >
      <form id="otp-form" onSubmit={submit} className="grid gap-4 pb-4">
        <OtpInput value={code} onChange={setCode} error={error} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" size="lg">
            Verify and post
          </Button>
          <Button size="lg" onClick={close}>
            Back
          </Button>
        </div>
        <p className="text-sm text-muted">
          {resent ? "New code sent. " : "Didn't get it? "}
          <button type="button" onClick={resend} className="cursor-pointer font-semibold text-accent-text underline underline-offset-2">
            Send a new code
          </button>
          <span className="block pt-1">Texts are simulated for now. The code is 123456, or open the notifications (bell, bottom right).</span>
        </p>
      </form>
    </Modal>
  );
}
