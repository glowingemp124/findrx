import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { draftStore } from "@/features/client/services/draft-store";
import { mockMedicationAssistant, type MedicationAssistant } from "@/features/client/services/medication-assistant";
import { cn } from "@/lib/cn";

type ChatMessage = { id: string; role: "assistant" | "client"; text: string };

const toMessages = (role: ChatMessage["role"], texts: string[]): ChatMessage[] =>
  texts.map((text) => ({ id: crypto.randomUUID(), role, text }));

/** "FindRx AI · Medication ID". Writes what it understands into the same draft the form edits. */
export function MedicationChat({ assistant = mockMedicationAssistant }: { assistant?: MedicationAssistant }) {
  const [{ messages, suggestions }, setChat] = useState(() => {
    const greeting = assistant.greet(draftStore.get());
    return { messages: toMessages("assistant", greeting.messages), suggestions: greeting.suggestions };
  });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

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

  return (
    <div className="flex flex-col">
      <section aria-label="FindRx AI medication identification" className="card flex h-[420px] flex-col overflow-hidden sm:h-[520px]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <span className="grid size-10 place-items-center rounded-[12px] bg-accent text-accent-ink">
            <Icon name="sparkles" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">FindRx AI · Medication ID</h2>
            <p className="text-sm text-muted">Anonymous · no account needed</p>
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
              <span className="sr-only">FindRx AI is typing</span>
              <span aria-hidden>…</span>
            </p>
          ) : null}
        </div>

        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
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

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4 sm:py-3">
          <label htmlFor="chat-input" className="sr-only">
            Message FindRx AI
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type the medication name or label…"
            autoComplete="off"
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
      </section>
      <p className="mt-2 text-center text-sm text-muted sm:mt-3">FindRx AI only helps identify the product. It doesn't give medical advice.</p>
    </div>
  );
}
