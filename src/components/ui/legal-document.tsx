function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Older legal copy is plain text. "# " is a heading and a blank line starts a paragraph. */
export function plainToHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      const heading = lines[0]?.startsWith("# ") ? lines[0].slice(2).trim() : "";
      const body = (heading ? lines.slice(1) : lines).join(" ").trim();
      return `${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}${body ? `<p>${escapeHtml(body)}</p>` : ""}`;
    })
    .join("");
}

export function looksLikeHtml(text: string) {
  return /<\/?[a-z][^>]*>/i.test(text);
}

/** Drops scripts and event handlers before legal copy is shown. */
export function sanitizeHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, style, meta").forEach((node) => node.remove());
  for (const node of doc.body.querySelectorAll("*")) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || name === "style") node.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) node.removeAttribute(attr.name);
    }
  }
  return doc.body.innerHTML;
}

/** Renders the privacy policy or terms edited in the admin legal tab. */
export function LegalDocument({ text, bare = false }: { text: string; bare?: boolean }) {
  const html = sanitizeHtml(looksLikeHtml(text) ? text : plainToHtml(text));
  const body = (
    <div
      className="text-base leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-accent-text [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h2:first-child]:mt-0 [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
  if (bare) return body;
  return (
    <article className="card px-5 py-6 md:px-8">
      <div className="pt-2">{body}</div>
      <p className="mt-8 border-t border-line pt-6 text-center text-base text-muted">© 2026 FindRx. All rights reserved.</p>
    </article>
  );
}
