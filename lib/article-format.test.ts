import { describe, expect, it } from "vitest";
import { parseArticle, parseInline, safeHref, splitArticleDraft, weekStart } from "./article-format";

describe("article format", () => {
  it("keeps site and https links, drops anything else", () => {
    expect(safeHref("/clearances")).toBe("/clearances");
    expect(safeHref("https://pubmed.ncbi.nlm.nih.gov/1/")).toBe("https://pubmed.ncbi.nlm.nih.gov/1/");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("//evil.example")).toBeUndefined();
    expect(safeHref("http://plain.example")).toBeUndefined();
    expect(parseInline("See [the list](javascript:x) and [FDA](/clearances).")).toEqual([
      { text: "See " },
      { text: "the list" },
      { text: " and " },
      { text: "FDA", href: "/clearances" },
      { text: "." },
    ]);
  });

  it("parses headings, paragraphs and lists", () => {
    const blocks = parseArticle("## Regulatory\nTwo new clearances\nthis week.\n- One [A](/entities/a)\n- Two\n\nClosing.");
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "paragraph"]);
    expect(blocks[1]).toEqual({ type: "paragraph", parts: [{ text: "Two new clearances this week." }] });
  });

  it("splits an edited draft into title, summary and body", () => {
    expect(splitArticleDraft("# This week\n\nShort summary.\n\n## A\nBody text.")).toEqual({
      title: "This week",
      summary: "Short summary.",
      body: "## A\nBody text.",
    });
  });

  it("finds the Monday a Sunday article covers", () => {
    expect(weekStart(new Date("2026-10-11T09:00:00Z"))).toBe("2026-10-05");
    expect(weekStart(new Date("2026-10-12T09:00:00Z"))).toBe("2026-10-12");
  });
});
