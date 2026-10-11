import { buildCorpus, retrieve, type CorpusItem } from "../assistant/retrieve";
import { getAllTalks } from "../talks";
import type { TaskKind } from "./team";
import type { WeekItem } from "./context";
import { safeHref } from "../article-format";

/**
 * What each kind of task reads, how it is asked, and what a valid reply looks
 * like. Kept free of side effects: applying an approved task is in apply.ts.
 */
export type Prompt = { system: string; user: string; maxTokens?: number };

const site = "AVRMD, a professional community for virtual, augmented and mixed reality in medicine (clinicians, researchers, engineers, manufacturers and business people)";
const base = () => process.env.AUTH_URL ?? "https://avrmd.cyalin.com";
const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function sources(query: string, limit = 10) {
  const corpus = buildCorpus({ talks: await getAllTalks().catch(() => []) });
  return retrieve(query, corpus, { limit });
}

function sourceList(items: CorpusItem[]) {
  return items.map((item) => `[${item.id}] (${item.meta}) ${item.title}: ${item.body.slice(0, 300)}`).join("\n") || "(none found)";
}

/** The cited sources, in citation order, as absolute links. */
function cited(items: CorpusItem[], citations: unknown, text: string) {
  const listed = Array.isArray(citations) ? citations.filter((id): id is string => typeof id === "string") : [];
  const inText = [...text.matchAll(/\[(s\d+)\]/g)].map((match) => match[1]);
  const ids = [...new Set([...inText, ...listed])].filter((id) => items.some((item) => item.id === id));
  const links = ids.map((id) => {
    const item = items.find((candidate) => candidate.id === id)!;
    return { title: item.title, url: item.external ? item.href : `${base()}${item.href}` };
  });
  // Markers become [1], [2]… in citation order; unknown ones are dropped.
  const renumbered = text.replace(/\[(s\d+)\]/g, (_, id: string) => (ids.includes(id) ? `[${ids.indexOf(id) + 1}]` : "")).replace(/ +([.,;])/g, "$1");
  return { links, text: renumbered };
}

function withInstructions(text: string, instructions?: string | null) {
  return instructions ? `${text}\n\nDirection from the editor who assigned this: ${instructions.slice(0, 1000)}` : text;
}

export async function preparePrompt(kind: TaskKind, input: Record<string, unknown>, context: Record<string, unknown>, instructions?: string | null): Promise<{ prompt: Prompt; extra?: Record<string, unknown> } | { error: string }> {
  switch (kind) {
    case "draft_answer": {
      const title = str(context.title, 300);
      if (!title) return { error: "The question no longer exists." };
      const found = await sources(`${title} ${str(context.body, 600)}`);
      return {
        extra: { sources: found },
        prompt: {
          system: `You draft answers for ${site}. An editor reviews and posts your draft under their own name.
Use the numbered sources where they help and cite them as [s1], but write naturally, as an experienced colleague: never mention "sources", "the catalog" or "the source set". Where they don't cover something, give careful general professional knowledge and say it is general, or suggest what kind of member could help. Never advise on an individual patient. Plain text, 80-220 words, no headings or markdown. Write in the question's language.
Reply with JSON only: {"answer": string, "citations": string[], "confidence": number between 0 and 1}`,
          user: withInstructions(`Question: ${title}\nDetails: ${str(context.body, 2000) || "(none)"}\n\nSources:\n${sourceList(found)}`, instructions),
        },
      };
    }
    case "assess_report": {
      if (!context.text) return { error: "The reported content was already removed." };
      return {
        prompt: {
          system: `You are the moderation assistant of ${site}. Members may not post patient-identifiable information, spam or undisclosed promotion, harassment, misleading or unsafe medical claims, or copyrighted work. Professional disagreement and plain product mentions are allowed.
Read the reported content and recommend "hide" or "dismiss". Be fair to the author; when unsure, say so with low confidence.
Reply with JSON only: {"recommendation": "hide" | "dismiss", "reason": string (max 60 words), "confidence": number between 0 and 1}`,
          user: withInstructions(
            `Reported ${str(context.resourceType, 20)} for: ${str(context.reason, 80)}\nReporter's note: ${str(context.details, 500) || "(none)"}\n\nContent:\n${str(context.text, 3000)}`,
            instructions,
          ),
          maxTokens: 300,
        },
      };
    }
    case "draft_invitation":
      return {
        prompt: {
          system: `You write short personal invitation notes for ${site}. The note opens the invitation email from an editor, above a standard paragraph that already explains what AVRMD is. Write 2-4 warm, specific, professional sentences addressed to the person: why their expertise matters here and what they could contribute (answering questions, sharing talks, being findable). No flattery beyond the facts given, no invented achievements, no sign-off, no greeting line.
Reply with JSON only: {"note": string}`,
          user: withInstructions(
            `Invitee: ${str(input.name, 120) || "(name not given)"}\nTheir field and work: ${str(input.about, 1000) || "(not given)"}\nEditor sending it: ${str(context.inviterName, 120)}`,
            instructions,
          ),
          maxTokens: 300,
        },
      };
    case "site_report":
      return {
        prompt: {
          system: `You are the analyst of ${site}. Write the weekly operations report for the editors from the numbers given: what changed, what needs attention, and 3 concrete suggestions to grow an active, helpful community. Don't invent numbers. Plain text, short paragraphs, at most 250 words.
Reply with JSON only: {"summary": string, "attention": string[], "suggestions": string[]}`,
          user: withInstructions(`Figures for the last 7 days (and totals):\n${JSON.stringify(context, null, 1)}`, instructions),
        },
      };
    case "weekly_article": {
      const items = (context.items as WeekItem[] | undefined) ?? [];
      const guides = (context.guides as WeekItem[] | undefined) ?? [];
      if (items.length === 0) return { error: "Nothing new this week to write about." };
      const all = [...items, ...guides];
      const list = all.map((item, index) => `[s${index + 1}] (${item.kind}${item.date ? `, ${item.date}` : ""}${item.note ? `, ${item.note}` : ""}) ${item.title}`).join("\n");
      return {
        extra: { links: all.map((item) => item.href), titles: all.map((item) => item.title) },
        prompt: {
          system: `You are Mira, the editor of ${site}. Every Sunday you write one article so a busy professional can catch up on the week in 3 minutes.
Use ONLY the numbered items given. Write about the field, not about AVRMD's feed: never say how many items AVRMD tracked, catalogued or recorded. The title names the week's most important development. Open with the two or three things a reader must know. Then group what matters under headings such as regulatory (FDA authorizations and 510(k) news wherever they appear), research and trials, industry, community; skip a heading with nothing to say. Point out trends as themes (what several items have in common), and why they matter to clinicians, researchers, engineers and business people. The trend counts only tell you where activity grew; don't quote them. Don't invent facts beyond the item titles; don't overstate a single paper or a trial registration. Not medical advice.
Link generously with [link text](sN) using the item numbers; the link text is words from your sentence, never the number itself; including the topic and stage guides where relevant and the community questions (invite readers to answer). Format: short paragraphs, "## " section headings, "- " bullet lists. No other markdown. 350-650 words.
Reply with JSON only: {"title": string (max 90 chars, specific to this week), "summary": string (1-2 sentences), "body": string}`,
          user: withInstructions(`Week trend (items discovered per category, this week vs previous week): ${JSON.stringify(context.trend)}\n\nItems:\n${list}`, instructions),
          maxTokens: 1800,
        },
      };
    }
    case "research_brief": {
      const topic = str(input.topic, 300);
      if (!topic) return { error: "No topic given." };
      const found = await sources(topic, 12);
      return {
        extra: { sources: found },
        prompt: {
          system: `You write research briefings for the editors of ${site}. From the numbered sources only, summarize what AVRMD knows about the topic: products and companies, regulatory status, evidence, open problems. Cite every claim as [s1]. Say plainly what is missing. Plain text, at most 250 words, no markdown.
Reply with JSON only: {"brief": string, "citations": string[], "gaps": string[]}`,
          user: withInstructions(`Topic: ${topic}\n\nSources:\n${sourceList(found)}`, instructions),
        },
      };
    }
  }
}

/** Keeps only what each kind may return; anything else is a failed run. */
export function validateOutput(kind: TaskKind, json: Record<string, unknown>, extra: Record<string, unknown> = {}): Record<string, unknown> | null {
  const confidence = typeof json.confidence === "number" ? Math.max(0, Math.min(1, json.confidence)) : undefined;
  const list = (value: unknown, max: number) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 400)).slice(0, max) : [];
  const found = (extra.sources as CorpusItem[] | undefined) ?? [];
  switch (kind) {
    case "draft_answer": {
      const answer = str(json.answer, 5000);
      if (answer.length < 10) return null;
      const { links, text } = cited(found, json.citations, answer);
      const body = links.length ? `${text}\n\nSources:\n${links.map((link, index) => `[${index + 1}] ${link.title} — ${link.url}`).join("\n")}` : text;
      return { text: body.slice(0, 5000), confidence };
    }
    case "assess_report": {
      const recommendation = json.recommendation === "hide" || json.recommendation === "dismiss" ? json.recommendation : null;
      if (!recommendation) return null;
      return { recommendation, reason: str(json.reason, 600), confidence };
    }
    case "draft_invitation": {
      const note = str(json.note, 1500);
      return note.length >= 10 ? { text: note } : null;
    }
    case "site_report": {
      const summary = str(json.summary, 3000);
      if (!summary) return null;
      const attention = list(json.attention, 6);
      const suggestions = list(json.suggestions, 6);
      const text = [summary, attention.length ? `\nNeeds attention:\n${attention.map((item) => `- ${item}`).join("\n")}` : "", suggestions.length ? `\nSuggestions:\n${suggestions.map((item) => `- ${item}`).join("\n")}` : ""].join("\n").trim();
      return { text };
    }
    case "weekly_article": {
      const links = (extra.links as string[] | undefined) ?? [];
      const titles = (extra.titles as string[] | undefined) ?? [];
      const title = str(json.title, 120).replace(/^#+\s*/, "");
      const summary = str(json.summary, 400);
      const raw = str(json.body, 9000);
      if (!title || raw.length < 200) return null;
      // [text](sN) becomes a real link; unknown numbers and unsafe targets leave the text unlinked.
      const body = raw.replace(/\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g, (_, label: string, target: string) => {
        const numbered = /^s(\d+)$/.exec(target);
        const href = numbered ? links[Number(numbered[1]) - 1] : safeHref(target);
        // A bare marker as the link text ("s3") reads as noise; use the item's title.
        const labelNumber = /^\[?s(\d+)\]?$/.exec(label.trim());
        const text = labelNumber ? (titles[Number(labelNumber[1]) - 1] ?? label) : label;
        return href && safeHref(href) ? `[${text}](${href})` : text;
      });
      const linked = (body.match(/\]\(/g) ?? []).length;
      return { text: `# ${title}\n\n${summary}\n\n${body}`, links: linked };
    }
    case "research_brief": {
      const brief = str(json.brief, 4000);
      if (!brief) return null;
      const { links, text: body } = cited(found, json.citations, brief);
      const gaps = list(json.gaps, 6);
      const text = [body, gaps.length ? `\nGaps:\n${gaps.map((gap) => `- ${gap}`).join("\n")}` : "", links.length ? `\nSources:\n${links.map((link, index) => `[${index + 1}] ${link.title} — ${link.url}`).join("\n")}` : ""].join("\n").trim();
      return { text };
    }
  }
}
