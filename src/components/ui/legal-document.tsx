/**
 * Renders the HTML a legal endpoint will return.
 * The string is the stand-in until that API exists.
 */
export function LegalDocument({ html }: { html: string }) {
  return (
    <article className="card px-5 py-6 md:px-8">
      <div
        className="pt-2 text-base leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-accent-text [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h2:first-child]:mt-0 [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="mt-8 border-t border-line pt-6 text-center text-base text-muted">
        © 2026 FindRx. All rights reserved.
      </p>
    </article>
  );
}
