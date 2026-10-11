import { and, count, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDatabase } from "../client";
import { agentSettings, agentTasks } from "../schema";
import { team, type TaskKind } from "@/lib/agents/team";

export type AgentTask = typeof agentTasks.$inferSelect;
export type AgentSetting = { enabled: boolean; autoAssign: boolean; dailyLimit: number };

const defaults: AgentSetting = { enabled: true, autoAssign: false, dailyLimit: 20 };

export async function getAgentSettings(): Promise<Record<string, AgentSetting>> {
  const rows = await getDatabase().select().from(agentSettings);
  return Object.fromEntries(
    team.map((agent) => {
      const row = rows.find((candidate) => candidate.agentId === agent.id);
      return [
        agent.id,
        row ? { enabled: row.enabled, autoAssign: row.autoAssign, dailyLimit: row.dailyLimit } : { ...defaults, autoAssign: Boolean(agent.autoByDefault) },
      ];
    }),
  );
}

export async function updateAgentSettings(agentId: string, fields: Partial<AgentSetting>) {
  const current = (await getAgentSettings())[agentId] ?? defaults;
  const next = { ...current, ...fields };
  await getDatabase()
    .insert(agentSettings)
    .values({ agentId, ...next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: agentSettings.agentId, set: { ...next, updatedAt: new Date() } });
  return next;
}

export async function createAgentTask(task: {
  agentId: string;
  kind: TaskKind;
  title: string;
  input: Record<string, unknown>;
  instructions?: string | null;
  createdById?: string | null;
}) {
  const [row] = await getDatabase()
    .insert(agentTasks)
    .values({ ...task, instructions: task.instructions || null, createdById: task.createdById ?? null })
    .returning();
  return row;
}

export async function getAgentTask(id: string) {
  const [row] = await getDatabase().select().from(agentTasks).where(eq(agentTasks.id, id)).limit(1);
  return row;
}

export async function listAgentTasks(filter: { status?: AgentTask["status"][]; agentId?: string; limit?: number } = {}) {
  const parts = [
    filter.status?.length ? inArray(agentTasks.status, filter.status) : undefined,
    filter.agentId ? eq(agentTasks.agentId, filter.agentId) : undefined,
  ].filter(Boolean);
  return getDatabase()
    .select()
    .from(agentTasks)
    .where(parts.length ? and(...parts) : undefined)
    .orderBy(desc(agentTasks.createdAt))
    .limit(filter.limit ?? 100);
}

/** Per agent: tasks by status, and how many it started in the last 24 hours. */
export async function agentTaskCounts() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [byStatus, today] = await Promise.all([
    getDatabase()
      .select({ agentId: agentTasks.agentId, status: agentTasks.status, n: count() })
      .from(agentTasks)
      .groupBy(agentTasks.agentId, agentTasks.status),
    getDatabase()
      .select({ agentId: agentTasks.agentId, n: count() })
      .from(agentTasks)
      .where(and(isNotNull(agentTasks.startedAt), gte(agentTasks.startedAt, since)))
      .groupBy(agentTasks.agentId),
  ]);
  return Object.fromEntries(
    team.map((agent) => [
      agent.id,
      {
        today: today.find((row) => row.agentId === agent.id)?.n ?? 0,
        ...Object.fromEntries(byStatus.filter((row) => row.agentId === agent.id).map((row) => [row.status, row.n])),
      } as Record<string, number>,
    ]),
  );
}

export async function countRunsSince(since: Date, agentId?: string) {
  const [row] = await getDatabase()
    .select({ n: count() })
    .from(agentTasks)
    .where(and(isNotNull(agentTasks.startedAt), gte(agentTasks.startedAt, since), agentId ? eq(agentTasks.agentId, agentId) : undefined));
  return row.n;
}

/** Takes a queued task for one run; two workers can't both win. */
export async function claimAgentTask(id: string) {
  const [row] = await getDatabase()
    .update(agentTasks)
    .set({ status: "running", startedAt: new Date(), error: null })
    .where(and(eq(agentTasks.id, id), eq(agentTasks.status, "queued")))
    .returning();
  return row;
}

export async function finishAgentTask(
  id: string,
  fields: Pick<AgentTask, "status"> & Partial<Pick<AgentTask, "output" | "error" | "model" | "inputTokens" | "outputTokens">>,
) {
  await getDatabase()
    .update(agentTasks)
    .set({ ...fields, finishedAt: new Date() })
    .where(eq(agentTasks.id, id));
}

/** A person's decision. Only a task waiting for review can be decided, once. */
export async function decideAgentTask(
  id: string,
  reviewerId: string,
  status: "approved" | "rejected",
  fields: { output?: Record<string, unknown>; reviewNote?: string | null } = {},
) {
  const [row] = await getDatabase()
    .update(agentTasks)
    .set({
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: fields.reviewNote || null,
      ...(fields.output ? { output: fields.output } : {}),
    })
    .where(and(eq(agentTasks.id, id), eq(agentTasks.status, "review")))
    .returning();
  return row;
}

/** Back into the queue: a failed or rejected task, run again. */
export async function requeueAgentTask(id: string, instructions?: string | null) {
  const [row] = await getDatabase()
    .update(agentTasks)
    .set({
      status: "queued",
      output: null,
      error: null,
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      startedAt: null,
      finishedAt: null,
      ...(instructions !== undefined ? { instructions: instructions || null } : {}),
    })
    .where(and(eq(agentTasks.id, id), inArray(agentTasks.status, ["failed", "rejected", "review"])))
    .returning();
  return row;
}

export async function cancelAgentTask(id: string) {
  const [row] = await getDatabase()
    .update(agentTasks)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(and(eq(agentTasks.id, id), inArray(agentTasks.status, ["queued", "review"])))
    .returning();
  return row;
}

/** Whether something is already being worked on, so routines don't duplicate. */
export async function hasOpenTask(kind: TaskKind, key: string, value: string) {
  const [row] = await getDatabase()
    .select({ n: count() })
    .from(agentTasks)
    .where(
      and(
        eq(agentTasks.kind, kind),
        sql`${agentTasks.input}->>${key} = ${value}`,
        inArray(agentTasks.status, ["queued", "running", "review", "approved"]),
      ),
    );
  return row.n > 0;
}

export async function lastTaskOfKind(kind: TaskKind) {
  const [row] = await getDatabase()
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.kind, kind))
    .orderBy(desc(agentTasks.createdAt))
    .limit(1);
  return row;
}

export async function queuedTaskIds(limit: number) {
  const rows = await getDatabase()
    .select({ id: agentTasks.id })
    .from(agentTasks)
    .where(eq(agentTasks.status, "queued"))
    .orderBy(agentTasks.createdAt)
    .limit(limit);
  return rows.map((row) => row.id);
}

/** A run that died mid-way (process restart) goes back to the queue after 10 minutes. */
export async function releaseStaleRuns() {
  await getDatabase()
    .update(agentTasks)
    .set({ status: "queued", startedAt: null })
    .where(and(eq(agentTasks.status, "running"), sql`${agentTasks.startedAt} < now() - interval '10 minutes'`));
}

/** An approval whose effect couldn't be applied goes back to waiting. */
export async function reopenAgentTask(id: string, error: string) {
  await getDatabase()
    .update(agentTasks)
    .set({ status: "review", reviewedById: null, reviewedAt: null, error })
    .where(eq(agentTasks.id, id));
}
