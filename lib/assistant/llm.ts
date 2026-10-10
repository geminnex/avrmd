import type { AssistantAction } from "./actions";
import type { CorpusItem } from "./retrieve";

export const promptVersion = "assist-2026-10-10";

export type ModelReply = {
  answer: string;
  citations: string[];
  actions: string[];
  followups: string[];
};

const systemPrompt = `You are the assistant of AVRMD, a professional network for medical virtual, augmented and mixed reality. Your readers are clinicians, researchers, engineers, device makers, regulatory and business people.

Answer ONLY from the numbered sources provided. After each claim, cite its source as [s1], [s2]. Never cite a source that is not listed, and never state a fact the sources do not support. If the sources do not answer the question, say so plainly in one sentence and point to the most useful next step instead.

Be brief: at most 120 words, plain sentences, no headings, no markdown. Reply in the language the question is written in. This is professional information, not medical advice: never advise on an individual patient's care.

Choose up to 3 next steps from the offered action ids that would genuinely help this person, most useful first. Optionally suggest up to 2 short follow-up questions they could ask next.

Reply with JSON only: {"answer": string, "citations": string[], "actions": string[], "followups": string[]}`;

export function buildMessages(query: string, items: CorpusItem[], actions: AssistantAction[], pageContext?: string) {
  const sources = items
    .map((item) => `[${item.id}] (${item.meta}) ${item.title} — ${item.body.slice(0, 280)}`)
    .join("\n");
  const offered = actions.map((action) => `${action.id}: ${action.label}`).join("\n");
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Question: ${query}\n${pageContext ? `\nThe reader is currently on: ${pageContext}\n` : ""}\nSources:\n${sources || "(none found)"}\n\nOffered actions:\n${offered}`,
    },
  ];
}

/**
 * Accepts only what the model was allowed to say: citations to sources it
 * was given, actions it was offered. A marker pointing anywhere else is
 * removed from the text rather than shown as a dead reference.
 */
export function validateReply(raw: unknown, items: CorpusItem[], actions: AssistantAction[]): ModelReply | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.answer !== "string" || value.answer.trim().length === 0) return null;

  const sourceIds = new Set(items.map((item) => item.id));
  const actionIds = new Set(actions.map((action) => action.id));
  const strings = (input: unknown) =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];

  const answer = value.answer
    .slice(0, 1500)
    .replace(/\[(s\d+)\]/g, (marker, id: string) => (sourceIds.has(id) ? marker : ""))
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  const cited = [...answer.matchAll(/\[(s\d+)\]/g)].map((match) => match[1]);

  return {
    answer,
    citations: [...new Set([...cited, ...strings(value.citations).filter((id) => sourceIds.has(id))])],
    actions: [...new Set(strings(value.actions).filter((id) => actionIds.has(id)))].slice(0, 3),
    followups: strings(value.followups)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 140)
      .slice(0, 2),
  };
}

export type ModelCall = {
  reply: ModelReply | null;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  error?: string;
};

export async function callModel(
  messages: { role: string; content: string }[],
  items: CorpusItem[],
  actions: AssistantAction[],
): Promise<ModelCall> {
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.AUTH_URL ?? "https://avrmd.cyalin.com",
        "X-Title": "AVRMD",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        messages,
        response_format: { type: "json_object" },
        // Hidden reasoning would spend the token budget before the answer.
        reasoning: { enabled: false },
        // Only providers that neither train on nor retain the request.
        provider: { data_collection: "deny" },
      }),
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) return { reply: null, model, latencyMs, error: `http_${response.status}` };

    const payload = await response.json();
    const content: unknown = payload?.choices?.[0]?.message?.content;
    let parsed: unknown = null;
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      } catch {
        parsed = null;
      }
    }
    const reply = validateReply(parsed, items, actions);
    return {
      reply,
      model: typeof payload?.model === "string" ? payload.model : model,
      inputTokens: payload?.usage?.prompt_tokens,
      outputTokens: payload?.usage?.completion_tokens,
      latencyMs,
      error: reply ? undefined : "invalid_reply",
    };
  } catch (error) {
    return {
      reply: null,
      model,
      latencyMs: Date.now() - started,
      error: controller.signal.aborted ? "timeout" : String((error as Error)?.message ?? error).slice(0, 80),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The site's content is English. A question in another language, or one
 * worded unlike anything indexed, is restated as English search terms
 * before retrieval; the answer is still written in the reader's language.
 */
export async function rewriteForSearch(query: string): Promise<{ text: string | null; call: Omit<ModelCall, "reply"> }> {
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const started = Date.now();
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(6000),
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 80,
        reasoning: { enabled: false },
        provider: { data_collection: "deny" },
        messages: [
          {
            role: "system",
            content:
              "Rewrite the user's question about medical XR as a short English search query (at most 12 words) using standard clinical and engineering terms. Reply with the query only.",
          },
          { role: "user", content: query },
        ],
      }),
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) return { text: null, call: { model, latencyMs, error: `http_${response.status}` } };
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.replace(/["\n]/g, " ").trim().slice(0, 160) : null;
    return {
      text: text || null,
      call: {
        model: typeof payload?.model === "string" ? payload.model : model,
        inputTokens: payload?.usage?.prompt_tokens,
        outputTokens: payload?.usage?.completion_tokens,
        latencyMs,
        error: text ? undefined : "empty_rewrite",
      },
    };
  } catch (error) {
    return { text: null, call: { model, latencyMs: Date.now() - started, error: String((error as Error)?.message ?? error).slice(0, 80) } };
  }
}
