import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { answers, moderationReports, posts, questions } from "../schema";

export const reportableTypes = ["question", "answer", "post"] as const;
export type ReportableType = (typeof reportableTypes)[number];

export const reportReasons = {
  patient_information: "Contains patient or personal health information",
  spam: "Spam or undisclosed promotion",
  harassment: "Harassment or abuse",
  misleading: "Misleading or unsafe medical claim",
  copyright: "Copyright or someone else's work",
  other: "Something else",
} as const;
export type ReportReason = keyof typeof reportReasons;

/** The reported thing, for the editor's preview and its link. */
export async function getReportTarget(type: ReportableType, id: string) {
  const database = getDatabase();
  if (type === "question") {
    const [row] = await database.select().from(questions).where(eq(questions.id, id)).limit(1);
    return row ? { text: `${row.title}\n${row.body}`.trim(), href: `/questions/${row.id}`, hidden: row.status === "hidden" } : undefined;
  }
  if (type === "answer") {
    const [row] = await database.select().from(answers).where(eq(answers.id, id)).limit(1);
    return row ? { text: row.body, href: `/questions/${row.questionId}#answer-${row.id}`, hidden: row.status === "hidden" } : undefined;
  }
  const [row] = await database.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ? { text: row.body, href: `/posts/${row.id}`, hidden: false } : undefined;
}

export async function createReport(params: { reporterId: string; resourceType: ReportableType; resourceId: string; reason: ReportReason; details?: string }) {
  const [row] = await getDatabase()
    .insert(moderationReports)
    .values({ ...params, details: params.details ?? null })
    .returning({ id: moderationReports.id });
  return row;
}

export async function listOpenReports() {
  const rows = await getDatabase()
    .select()
    .from(moderationReports)
    .where(eq(moderationReports.status, "submitted"))
    .orderBy(desc(moderationReports.createdAt))
    .limit(100);
  return Promise.all(
    rows.map(async (report) => ({
      report,
      target: await getReportTarget(report.resourceType as ReportableType, report.resourceId).catch(() => undefined),
    })),
  );
}

/**
 * Hiding takes a question or answer out of every listing (status hidden);
 * a post has no hidden state, so it is deleted. Either way the report is
 * closed, along with any other open report on the same item.
 */
export async function resolveReport(id: string, action: "hide" | "dismiss") {
  const database = getDatabase();
  const [report] = await database.select().from(moderationReports).where(eq(moderationReports.id, id)).limit(1);
  if (!report) return false;
  if (action === "hide") {
    if (report.resourceType === "question") await database.update(questions).set({ status: "hidden" }).where(eq(questions.id, report.resourceId));
    if (report.resourceType === "answer") await database.update(answers).set({ status: "hidden" }).where(eq(answers.id, report.resourceId));
    if (report.resourceType === "post") await database.delete(posts).where(eq(posts.id, report.resourceId));
  }
  await database
    .update(moderationReports)
    .set({ status: action === "hide" ? "approved" : "rejected", resolvedAt: new Date() })
    .where(
      action === "hide"
        ? and(eq(moderationReports.resourceId, report.resourceId), eq(moderationReports.status, "submitted"))
        : eq(moderationReports.id, id),
    );
  return true;
}
