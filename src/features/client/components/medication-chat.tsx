import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AreaDialog, type AreaSubmission } from "@/features/client/components/area-dialog";
import { draftStore, intakeFlags } from "@/features/client/services/draft-store";
import { intakeStep, mockMedicationAssistant, type MedicationAssistant } from "@/features/client/services/medication-assistant";
import { hasDraftErrors, validateDraft } from "@/features/client/lib/validate-draft";
import { formatPhone } from "@/features/requests/lib/formatters";
import type { RequestDraft } from "@/features/requests/types";
import { cn } from "@/lib/cn";

type ChatMessage = { id: string; role: "assistant" | "client"; text: string };

const toMessages = (role: ChatMessage["role"], texts: string[]): ChatMessage[] =>
  texts.map((text) => ({ id: crypto.randomUUID(), role, text }));

/** The whole Blind Request, asked in the chat. Posts when every answer is in. */
export function MedicationChat({
  assistant = mockMedicationAssistant,
  onPost,
}: {
  assistant?: MedicationAssistant;
  onPost: (draft: RequestDraft) => void;
}) {
  const draft = draftStore.use();
  const flags = intakeFlags.use();
  const step = intakeStep(draft, flags);
  const [{ messages, suggestions }, setChat] = useState(() => {
    const greeting = assistant.greet(draftStore.get());
    return { messages: toMessages("assistant", greeting.messages), suggestions: greeting.suggestions };
  });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, step]);

  useEffect(() => {
    if (step === "place" && !thinking) setPlaceOpen(true);
  }, [step, thinking]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setInput("");
    setThinking(true);
    setChat((chat) => ({ messages: [...chat.messages, ...toMessages("client", [trimmed])], suggestions: [] }));
    try {
      const reply = await assistant.respond(trimmed, draftStore.get());
      draftStore.patch(reply.patch);
      setChat((chat) => ({
        messages: [...chat.messages, ...toMessages("assistant", reply.messages)],
        suggestions: reply.suggestions,
      }));
    } finally {
      setThinking(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const post = () => {
    const current = draftStore.get();
    if (hasDraftErrors(validateDraft(current))) return;
    onPost(current);
  };

  const confirmPlace = (submission: AreaSubmission) => {
    draftStore.patch({
      area: submission.area,
      radiusMiles: submission.radiusMiles,
      latitude: submission.latitude,
      longitude: submission.longitude,
      fullName: submission.fullName,
      phone: submission.phone,
    });
    intakeFlags.mark("radius");
    intakeFlags.mark("name");
    const next = draftStore.get();
    const who = submission.fullName.trim() || "No name";
    const distance = submission.radiusMiles <= 0 ? "Any distance" : `${submission.radiusMiles} miles`;
    setChat((chat) => ({
      messages: [
        ...chat.messages,
        ...toMessages("client", [`${submission.area} · ${distance} · ${who} · ${formatPhone(submission.phone)}`]),
        ...toMessages("assistant", assistant.greet(next).messages.slice(1)),
      ],
      suggestions: [],
    }));
    setPlaceOpen(false);
  };

  return (
    <div className="flex flex-col">
      <section aria-label="FindRx request" className="card flex h-[min(380px,56dvh)] min-h-[240px] flex-col overflow-hidden sm:h-[min(420px,62dvh)] sm:min-h-[300px]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <span className="grid size-10 place-items-center rounded-[12px] bg-accent text-accent-ink">
            <Icon name="sparkles" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Find your medication</h2>
            <p className="text-sm text-muted">One medication · no account to search</p>
          </div>
        </header>

        <div ref={logRef} role="log" aria-live="polite" className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {messages.map((message) => (
            <p
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-md",
                message.role === "assistant"
                  ? "self-start rounded-tl-[6px] bg-side-well text-ink"
                  : "self-end rounded-tr-[6px] bg-accent text-accent-ink",
              )}
            >
              {message.text}
            </p>
          ))}
          {thinking ? (
            <p className="self-start rounded-[16px] rounded-tl-[6px] bg-side-well px-3.5 py-2.5 text-md text-muted">
              <span className="sr-only">FindRx is typing</span>
              <span aria-hidden>…</span>
            </p>
          ) : null}
        </div>

        {suggestions.length > 0 && step !== "place" ? (
          <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={thinking}
                onClick={() => void send(suggestion)}
                className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold text-ink-2 ring-1 ring-line-strong transition-colors hover:bg-side-hover disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {step === "done" && !thinking ? (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Button variant="primary" size="lg" className="h-12 w-full text-lg" onClick={post}>
              Post request
            </Button>
          </div>
        ) : step === "place" && !thinking ? (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Button variant="primary" size="lg" className="h-12 w-full text-lg" onClick={() => setPlaceOpen(true)}>
              Set area, name, and phone
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
            <label htmlFor="chat-input" className="sr-only">
              Message FindRx
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your answer…"
              autoComplete="off"
              inputMode={step === "quantity" ? "tel" : "text"}
              className="h-11 min-w-0 flex-1 rounded-full bg-canvas px-4 text-md text-ink ring-1 ring-line-strong outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || thinking}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-45"
            >
              <Icon name="arrowRight" />
            </button>
          </form>
        )}
      </section>
      <AreaDialog open={placeOpen} draft={draft} onClose={() => setPlaceOpen(false)} onConfirm={confirmPlace} />
      <p className="mt-2 text-center text-sm text-muted sm:mt-3">FindRx only helps you post the request. It doesn't give medical advice.</p>
    </div>
  );
}
