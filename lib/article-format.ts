/**
 * The weekly article's markup: "## " headings, "- " list items, paragraphs,
 * and [text](link) links to site paths or https URLs. Anything else is plain
 * text. Parsed into blocks and rendered as React elements, never as HTML.
 */
export type Inline = { text: string; href?: string };
export type Block = { type: "heading" | "paragraph"; parts: Inline[] } | { type: "list"; items: Inline[][] };

const linkPattern = /\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g;

export function safeHref(href: string) {
  if (/^\/(?!\/)[\w\-./?=&#%]*$/.test(href)) return href;
  if (/^https:\/\/[^\s"'<>]+$/.test(href)) return href;
  return undefined;
}

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(linkPattern)) {
    if (match.index! > last) parts.push({ text: text.slice(last, match.index) });
    const href = safeHref(match[2]);
    parts.push(href ? { text: match[1], href } : { text: match[1] });
    last = match.index! + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.map((part) => ({ ...part, text: part.text.replace(/\*\*|__/g, "") })).filter((part) => part.text);
}

export function parseArticle(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", parts: parseInline(paragraph.join(" ")) });
    if (list.length) blocks.push({ type: "list", items: list });
    paragraph = [];
    list = [];
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (/^#{1,3}\s+/.test(line)) {
      flush();
      blocks.push({ type: "heading", parts: parseInline(line.replace(/^#{1,3}\s+/, "")) });
    } else if (/^[-*]\s+/.test(line)) {
      if (paragraph.length) {
        blocks.push({ type: "paragraph", parts: parseInline(paragraph.join(" ")) });
        paragraph = [];
      }
      list.push(parseInline(line.replace(/^[-*]\s+/, "")));
    } else {
      if (list.length) {
        blocks.push({ type: "list", items: list });
        list = [];
      }
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** The draft as one editable text: "# Title", a summary paragraph, then the body. */
export function splitArticleDraft(text: string) {
  const lines = text.replace(/\r/g, "").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim());
  const title = (lines[titleIndex] ?? "").replace(/^#\s*/, "").trim();
  const rest = lines.slice(titleIndex + 1).join("\n").trim();
  const [summary, ...body] = rest.split(/\n\s*\n/);
  return { title, summary: (summary ?? "").trim(), body: body.join("\n\n").trim() };
}

/** The Monday (UTC) of the week before a given date: the week a Sunday article covers. */
export function weekStart(date = new Date()) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}
