// AI triage of the discovery queue (see lib/triage.ts).
//
//   node_modules/.bin/tsx scripts/triage-candidates.ts [--limit=N] [--dry-run]
//
// Untriaged pending candidates are sent to the model 20 at a time.
// "signal_only" and "off_topic" are set aside as dismissed-by-AI (reversible
// in the workspace); "add_record" stays pending with a draft for an editor.
// Results are saved after every batch, so an interrupted run resumes.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildTriageMessages, triagePromptVersion, validateTriage, type Triage, type TriageInput } from "../lib/triage";

const repo = resolve(__dirname, "..");
const candidatesPath = join(repo, "data", "candidates.json");
const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")));
const limit = args.limit ? Number(args.limit) : Infinity;
const dryRun = "dry-run" in args;
const batchSize = 20;

// Same files Next reads in production, later files winning over earlier
// ones; a variable already in the real environment wins over all of them.
const fromFiles: Record<string, string> = {};
for (const file of [".env", ".env.production", ".env.production.local"]) {
  const path = join(repo, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) fromFiles[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}
for (const [key, value] of Object.entries(fromFiles)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL && process.env.OPENROUTER_MODEL !== "openrouter/free"
  ? process.env.OPENROUTER_MODEL
  : "anthropic/claude-haiku-5.5";
if (!apiKey) {
  console.error("OPENROUTER_API_KEY is not set.");
  process.exit(1);
}

type Candidate = TriageInput & { status: string; triage?: Triage; decidedAt?: string; decidedBy?: string };

const readCandidates = (): Candidate[] => JSON.parse(readFileSync(candidatesPath, "utf8"));

/** Re-reads before writing, so a robot run in between isn't overwritten. */
function saveTriage(results: Map<string, Triage>) {
  const latest = readCandidates();
  const now = new Date().toISOString();
  for (const candidate of latest) {
    const triage = results.get(candidate.id);
    if (!triage || candidate.status !== "pending") continue;
    candidate.triage = triage;
    if (triage.recommendation !== "add_record") {
      candidate.status = "dismissed";
      candidate.decidedBy = "ai";
      candidate.decidedAt = now;
    }
  }
  writeFileSync(`${candidatesPath}.tmp`, `${JSON.stringify(latest, null, 2)}\n`);
  renameSync(`${candidatesPath}.tmp`, candidatesPath);
}

async function callModel(batch: TriageInput[]) {
  const started = Date.now();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "AVRMD" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 6000,
      reasoning: { enabled: false },
      response_format: { type: "json_object" },
      provider: { data_collection: "deny" },
      messages: buildTriageMessages(batch),
    }),
  });
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  let parsed: unknown = null;
  try {
    parsed = typeof content === "string" ? JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")) : null;
  } catch {
    parsed = null;
  }
  return {
    results: validateTriage(parsed, batch, typeof payload?.model === "string" ? payload.model : model),
    usage: payload?.usage ?? {},
    latencyMs: Date.now() - started,
    error: response.ok ? undefined : `http_${response.status}`,
  };
}

async function main() {
  const queue = readCandidates()
    .filter((candidate) => candidate.status === "pending" && !candidate.triage)
    .slice(0, limit);
  console.log(`${queue.length} candidates to triage with ${model}${dryRun ? " (dry run)" : ""}`);

  const totals = { add_record: 0, signal_only: 0, off_topic: 0, failed: 0, inputTokens: 0, outputTokens: 0 };
  for (let start = 0; start < queue.length; start += batchSize) {
    const batch = queue.slice(start, start + batchSize).map(({ id, title, sourceLabel, sourceId, published, raw }) => ({
      id, title, sourceLabel, sourceId, published, raw,
    }));
    const call = await callModel(batch).catch((error) => ({
      results: new Map<string, Triage>(), usage: {}, latencyMs: 0, error: String(error?.message ?? error),
    }));
    totals.inputTokens += call.usage.prompt_tokens ?? 0;
    totals.outputTokens += call.usage.completion_tokens ?? 0;
    totals.failed += batch.length - call.results.size;
    for (const triage of call.results.values()) totals[triage.recommendation] += 1;

    try {
      const { recordAssistantRun } = await import("../lib/db/repositories/ai-usage");
      await recordAssistantRun({
        jobType: "candidate_triage",
        model,
        promptVersion: triagePromptVersion,
        inputTokens: call.usage.prompt_tokens,
        outputTokens: call.usage.completion_tokens,
        latencyMs: call.latencyMs,
        citations: call.results.size,
        error: call.error,
      });
    } catch {
      // The ledger is best effort for a batch job.
    }

    if (!dryRun && call.results.size > 0) saveTriage(call.results);
    if (dryRun) for (const [id, triage] of call.results) console.log(id, triage.recommendation, triage.confidence, triage.reason, triage.draft?.name ?? "");
    console.log(`batch ${start / batchSize + 1}: ${call.results.size}/${batch.length} triaged${call.error ? ` (${call.error})` : ""}`);
  }

  console.log(
    `done: ${totals.add_record} recommended, ${totals.signal_only} signal only, ${totals.off_topic} off topic, ${totals.failed} not triaged · ${totals.inputTokens} in / ${totals.outputTokens} out tokens`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
