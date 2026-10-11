import { recordAssistantRun, countRunsOfTypeSince } from "@/lib/db/repositories/ai-usage";
import {
  claimAgentTask,
  countRunsSince,
  finishAgentTask,
  getAgentSettings,
  queuedTaskIds,
  releaseStaleRuns,
} from "@/lib/db/repositories/agent-tasks";
import { callAgentModel } from "./model";
import { loadContext } from "./context";
import { getAgent, type TaskKind } from "./team";
import { preparePrompt, validateOutput } from "./work";

export const agentPromptVersion = "agents-2026-10-11";

/** Model calls per rolling 24 hours for the whole team, on top of each agent's own limit. */
const teamDailyLimit = () => Number(process.env.AGENT_DAILY_LIMIT ?? 60);

/**
 * Runs one queued task: checks the agent is on and under its limits, asks
 * the model, and leaves the result for review. Never throws.
 */
export async function runAgentTask(id: string) {
  const task = await claimAgentTask(id);
  if (!task) return;
  const agent = getAgent(task.agentId);
  const fail = (error: string) => finishAgentTask(task.id, { status: "failed", error });
  try {
    if (!agent) return await fail("Unknown agent.");
    const setting = (await getAgentSettings())[agent.id];
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (!setting.enabled) return await fail(`${agent.name} is switched off.`);
    // The claim above already counts this run, hence "greater than".
    if ((await countRunsSince(day, agent.id)) > setting.dailyLimit) return await fail(`${agent.name} reached its daily limit of ${setting.dailyLimit}. Retry tomorrow.`);
    if ((await countRunsOfTypeSince("agent_task", day)) >= teamDailyLimit()) return await fail("The team reached its daily limit. Retry tomorrow.");

    const context = await loadContext(task);
    const prepared = await preparePrompt(task.kind as TaskKind, task.input, context, task.instructions);
    if ("error" in prepared) return await fail(prepared.error);

    const call = await callAgentModel(prepared.prompt.system, prepared.prompt.user, prepared.prompt.maxTokens);
    const output = call.json ? validateOutput(task.kind as TaskKind, call.json, prepared.extra) : null;
    await recordAssistantRun({
      jobType: "agent_task",
      model: call.model,
      promptVersion: agentPromptVersion,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      latencyMs: call.latencyMs,
      citations: 0,
      error: output ? undefined : (call.error ?? "invalid_output"),
      result: { agent: agent.id, kind: task.kind },
    }).catch(() => undefined);

    if (!output) return await fail(call.error === "no_api_key" ? "No model is configured on this server." : `The model's reply couldn't be used (${call.error ?? "invalid output"}). Retry.`);
    await finishAgentTask(task.id, {
      status: "review",
      output,
      model: call.model,
      inputTokens: call.inputTokens ?? null,
      outputTokens: call.outputTokens ?? null,
    });
  } catch (error) {
    console.error("Agent task failed", task.id, error);
    await fail("Something went wrong while working on this. Retry.").catch(() => undefined);
  }
}

/** The worker's loop: one task at a time, oldest first. */
export async function runQueuedAgentTasks(max = 10) {
  await releaseStaleRuns();
  const ids = await queuedTaskIds(max);
  for (const id of ids) await runAgentTask(id);
  return ids.length;
}
