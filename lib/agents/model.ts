/**
 * One JSON-mode call to OpenRouter for the agents, with the same privacy
 * settings as the assistant: only providers that neither train on nor retain
 * the request, and no hidden reasoning eating the token budget.
 */
export type AgentCall = {
  json: Record<string, unknown> | null;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  error?: string;
};

export function agentModel() {
  const model = process.env.OPENROUTER_MODEL;
  return model && model !== "openrouter/free" ? model : "anthropic/claude-haiku-5.5";
}

export async function callAgentModel(system: string, user: string, maxTokens = 900): Promise<AgentCall> {
  const model = agentModel();
  const started = Date.now();
  if (!process.env.OPENROUTER_API_KEY) return { json: null, model, latencyMs: 0, error: "no_api_key" };
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.AUTH_URL ?? "https://avrmd.cyalin.com",
        "X-Title": "AVRMD agents",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        reasoning: { enabled: false },
        provider: { data_collection: "deny" },
      }),
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) return { json: null, model, latencyMs, error: `http_${response.status}` };
    const payload = await response.json();
    const content: unknown = payload?.choices?.[0]?.message?.content;
    let json: Record<string, unknown> | null = null;
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
        json = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        json = null;
      }
    }
    return {
      json,
      model: typeof payload?.model === "string" ? payload.model : model,
      inputTokens: payload?.usage?.prompt_tokens,
      outputTokens: payload?.usage?.completion_tokens,
      latencyMs,
      error: json ? undefined : "invalid_reply",
    };
  } catch (error) {
    return { json: null, model, latencyMs: Date.now() - started, error: String((error as Error)?.message ?? error).slice(0, 80) };
  }
}
