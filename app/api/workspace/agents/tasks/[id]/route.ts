import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import {
  cancelAgentTask,
  decideAgentTask,
  getAgentTask,
  reopenAgentTask,
  requeueAgentTask,
} from "@/lib/db/repositories/agent-tasks";
import { applyAgentTask } from "@/lib/agents/apply";
import { runAgentTask } from "@/lib/agents/runner";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), text: z.string().max(6000).optional(), recommendation: z.enum(["hide", "dismiss"]).optional(), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("reject"), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("retry"), instructions: z.string().trim().max(1000).optional() }),
  z.object({ action: z.literal("cancel") }),
]);

const reply = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: status < 300, message, ...extra }, { status });

/** Review one task: approve (apply its effect), reject, run again, or cancel. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return reply(404, "Not found.");
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !parsed.success) return reply(422, "Invalid request.");
  const task = await getAgentTask(id);
  if (!task) return reply(404, "Not found.");
  const body = parsed.data;

  if (body.action === "approve") {
    const text = body.text ?? (typeof task.output?.text === "string" ? task.output.text : undefined);
    const recommendation = body.recommendation ?? (task.output?.recommendation as "hide" | "dismiss" | undefined);
    // Decide first, atomically, so a double click can't apply twice.
    const decided = await decideAgentTask(id, user.id, "approved", {
      output: { ...(task.output ?? {}), ...(text !== undefined ? { text } : {}), ...(recommendation ? { decision: recommendation } : {}) },
      reviewNote: body.note,
    });
    if (!decided) return reply(409, "This task isn't waiting for review.");
    const applied = await applyAgentTask(task, user, { text, recommendation }).catch((error) => {
      console.error("Applying agent task failed", id, error);
      return { ok: false as const, message: "Couldn't apply it. Try again." };
    });
    if (!applied.ok) {
      await reopenAgentTask(id, applied.message);
      return reply(409, applied.message);
    }
    if (task.kind === "weekly_article") {
      // The list and the home page are cached; show the new article now.
      revalidatePath("/weekly");
      revalidatePath("/");
    }
    return reply(200, applied.message, { href: "href" in applied ? applied.href : undefined });
  }
  if (body.action === "reject") {
    return (await decideAgentTask(id, user.id, "rejected", { reviewNote: body.note }))
      ? reply(200, "Rejected.")
      : reply(409, "This task isn't waiting for review.");
  }
  if (body.action === "retry") {
    const queued = await requeueAgentTask(id, body.instructions);
    if (!queued) return reply(409, "Only a failed, rejected or waiting task can be run again.");
    after(() => runAgentTask(id));
    return reply(200, "Running again.");
  }
  return (await cancelAgentTask(id)) ? reply(200, "Cancelled.") : reply(409, "This task can't be cancelled now.");
}
