import { and, count, eq, gte } from "drizzle-orm";
import { getDatabase } from "../client";
import { aiJobs, aiRuns } from "../schema";

const assistantJob = "assistant_answer";

/**
 * One row per model call, as the AI governance policy requires: provider,
 * model, prompt version, tokens, latency and outcome. The question itself is
 * not stored.
 */
export async function recordAssistantRun(run: {
  /** Separate ledgers: only assistant answers count against its daily cap. */
  jobType?: "assistant_answer" | "candidate_triage";
  model: string;
  promptVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  citations: number;
  error?: string;
}) {
  const database = getDatabase();
  const [job] = await database
    .insert(aiJobs)
    .values({
      jobType: run.jobType ?? assistantJob,
      status: run.error ? "failed" : "completed",
      promptVersion: run.promptVersion,
      schemaVersion: "1",
      attempts: 1,
    })
    .returning({ id: aiJobs.id });
  await database.insert(aiRuns).values({
    jobId: job.id,
    provider: "openrouter",
    model: run.model,
    zeroDataRetention: true,
    inputTokens: run.inputTokens ?? null,
    outputTokens: run.outputTokens ?? null,
    latencyMs: run.latencyMs,
    result: { citations: run.citations },
    errorCode: run.error ?? null,
  });
}

export async function countAssistantRunsSince(since: Date) {
  const [row] = await getDatabase()
    .select({ total: count() })
    .from(aiRuns)
    .innerJoin(aiJobs, eq(aiJobs.id, aiRuns.jobId))
    .where(and(eq(aiJobs.jobType, assistantJob), gte(aiRuns.createdAt, since)));
  return row?.total ?? 0;
}
