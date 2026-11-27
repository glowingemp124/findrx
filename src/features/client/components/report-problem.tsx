import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { disputeStore } from "@/features/requests/services/dispute-store";
import type { BlindRequest } from "@/features/requests/types";

/** Patient says the pharmacy claimed the medication and didn't furnish it. */
export function ReportProblem({ request }: { request: BlindRequest }) {
  const disputes = disputeStore.use();
  const existing = disputes.find((item) => item.requestId === request.id);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!request.claim) return null;

  if (existing) {
    const message =
      existing.status === "refunded"
        ? "FindRx refunded this connection."
        : existing.status === "denied"
          ? "FindRx reviewed this and did not refund it."
          : existing.pharmacyNote
            ? "The pharmacy replied. FindRx will decide on a refund."
            : "FindRx has this report. The pharmacy can reply, then we decide on a refund.";
    return (
      <Notice tone={existing.status === "denied" ? "bad" : "accent"}>{message}</Notice>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 8) {
      setError("Tell us what happened, in a sentence or two.");
      return;
    }
    disputeStore.open({
      requestId: request.id,
      reference: request.reference,
      pharmacyId: request.claim!.pharmacyId,
      pharmacyName: request.claim!.pharmacy.name,
      medication: request.draft.medication.trim(),
      area: request.draft.area.trim(),
      patientNote: note.trim(),
    });
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-3 rounded-[18px] p-4 ring-1 ring-line-strong">
      <h2 className="text-lg font-bold tracking-tight">The pharmacy didn't have it</h2>
      <Textarea
        label="What happened"
        rows={3}
        value={note}
        error={error}
        placeholder="I went in and they didn't have the medication."
        onChange={(event) => setNote(event.target.value)}
      />
      <Button type="submit" variant="primary">
        Send report
      </Button>
    </form>
  );
}
