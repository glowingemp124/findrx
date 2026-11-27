import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { looksLikeHtml, plainToHtml } from "@/components/ui/legal-document";

const TOOLS: Array<{ label: string; command: string; value?: string }> = [
  { label: "Bold", command: "bold" },
  { label: "Italic", command: "italic" },
  { label: "Heading", command: "formatBlock", value: "H2" },
  { label: "List", command: "insertUnorderedList" },
];

/** A small HTML editor for the privacy policy and terms. The saved value is HTML. */
export function HtmlEditor({ label, value, onChange }: { label: string; value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ref.current || seeded.current) return;
    ref.current.innerHTML = looksLikeHtml(value) ? value : plainToHtml(value);
    seeded.current = true;
  }, [value]);

  const apply = (command: string, argument?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, argument);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {TOOLS.map((tool) => (
          <Button key={tool.label} type="button" size="sm" onClick={() => apply(tool.command, tool.value)}>
            {tool.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const href = window.prompt("Link address");
            if (href?.trim()) apply("createLink", href.trim());
          }}
        >
          Link
        </Button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="min-h-72 rounded-[16px] bg-card px-4 py-3 text-md leading-relaxed text-ink shadow-raise ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-accent [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
