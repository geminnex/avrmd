import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db/client";
import { answers, moderationReports, questions } from "@/lib/db/schema";
import { createAgentTask, getAgentSettings, hasOpenTask, lastTaskOfKind } from "@/lib/db/repositories/agent-tasks";

/**
 * The routines: what the scheduled worker hands each agent whose auto-assign
 * is on. Each item is assigned once (see hasOpenTask).
 */
export async function autoAssignAgentTasks() {
  const settings = await getAgentSettings();
  const database = getDatabase();
  let created = 0;
  const on = (id: string) => settings[id]?.enabled && settings[id]?.autoAssign;

  if (on("iris")) {
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortnight = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const waiting = await database
      .select({ id: questions.id, title: questions.title })
      .from(questions)
      .where(
        and(
          eq(questions.status, "visible"),
          lte(questions.createdAt, day),
          gte(questions.createdAt, fortnight),
          sql`not exists (select 1 from ${answers} where ${answers.questionId} = ${questions.id} and ${answers.status} = 'visible')`,
        ),
      )
      .limit(10);
    for (const question of waiting) {
      if (await hasOpenTask("draft_answer", "questionId", question.id)) continue;
      await createAgentTask({ agentId: "iris", kind: "draft_answer", title: `Answer: ${question.title}`.slice(0, 200), input: { questionId: question.id } });
      created += 1;
    }
  }

  if (on("sentinel")) {
    const open = await database
      .select({ id: moderationReports.id, type: moderationReports.resourceType, reason: moderationReports.reason })
      .from(moderationReports)
      .where(eq(moderationReports.status, "submitted"))
      .limit(20);
    for (const report of open) {
      if (await hasOpenTask("assess_report", "reportId", report.id)) continue;
      await createAgentTask({ agentId: "sentinel", kind: "assess_report", title: `Report on a ${report.type}: ${report.reason}`, input: { reportId: report.id } });
      created += 1;
    }
  }

  if (on("mira") && new Date().getUTCDay() === 0) {
    const last = await lastTaskOfKind("weekly_article");
    if (!last || Date.now() - last.createdAt.getTime() > 6 * 24 * 60 * 60 * 1000) {
      await createAgentTask({ agentId: "mira", kind: "weekly_article", title: `This week in medical XR, ${new Date().toISOString().slice(0, 10)}`, input: {} });
      created += 1;
    }
  }

  if (on("atlas")) {
    const last = await lastTaskOfKind("site_report");
    if (!last || Date.now() - last.createdAt.getTime() > 6.5 * 24 * 60 * 60 * 1000) {
      await createAgentTask({ agentId: "atlas", kind: "site_report", title: `Weekly report, ${new Date().toISOString().slice(0, 10)}`, input: {} });
      created += 1;
    }
  }
  return created;
}
