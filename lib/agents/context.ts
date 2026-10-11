import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db/client";
import { answers, invitations, moderationReports, pageViews, questions, users } from "@/lib/db/schema";
import { getQuestion } from "@/lib/db/repositories/questions";
import { getReportTarget, reportReasons, type ReportableType } from "@/lib/db/repositories/reports";
import { memberStats } from "@/lib/db/repositories/member-admin";
import { countRunsOfTypeSince } from "@/lib/db/repositories/ai-usage";
import { readQueue } from "@/lib/review-store";
import type { AgentTask } from "@/lib/db/repositories/agent-tasks";

/** The live facts a task needs, read at run time so a draft reflects the site as it is. */
export async function loadContext(task: AgentTask): Promise<Record<string, unknown>> {
  const input = task.input as Record<string, string | undefined>;
  switch (task.kind) {
    case "draft_answer": {
      const question = input.questionId ? await getQuestion(input.questionId) : undefined;
      return question ? { title: question.title, body: question.body } : {};
    }
    case "assess_report": {
      const [report] = input.reportId
        ? await getDatabase().select().from(moderationReports).where(eq(moderationReports.id, input.reportId)).limit(1)
        : [];
      if (!report) return {};
      const target = await getReportTarget(report.resourceType as ReportableType, report.resourceId).catch(() => undefined);
      return {
        resourceType: report.resourceType,
        reason: reportReasons[report.reason as keyof typeof reportReasons] ?? report.reason,
        details: report.details,
        text: target?.text,
        open: report.status === "submitted",
      };
    }
    case "draft_invitation": {
      const [creator] = task.createdById
        ? await getDatabase().select({ name: users.displayName }).from(users).where(eq(users.id, task.createdById)).limit(1)
        : [];
      return { inviterName: creator?.name || "An AVRMD editor" };
    }
    case "site_report":
      return siteFigures();
    case "weekly_article":
      return weekItems();
    default:
      return {};
  }
}

export async function siteFigures() {
  const database = getDatabase();
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekDay = week.toISOString().slice(0, 10);
  const [members, [{ newQuestions }], [{ unanswered }], [{ newAnswers }], [{ openReports }], assistantAnswers, topPages, [{ invited }]] =
    await Promise.all([
      memberStats(),
      database.select({ newQuestions: count() }).from(questions).where(gte(questions.createdAt, week)),
      database
        .select({ unanswered: count() })
        .from(questions)
        .where(and(eq(questions.status, "visible"), sql`not exists (select 1 from ${answers} where ${answers.questionId} = ${questions.id} and ${answers.status} = 'visible')`)),
      database.select({ newAnswers: count() }).from(answers).where(gte(answers.createdAt, week)),
      database.select({ openReports: count() }).from(moderationReports).where(eq(moderationReports.status, "submitted")),
      countRunsOfTypeSince("assistant_answer", week),
      database
        .select({ path: pageViews.path, views: sql<number>`sum(${pageViews.views})::int` })
        .from(pageViews)
        .where(gte(pageViews.day, weekDay))
        .groupBy(pageViews.path)
        .orderBy(desc(sql`sum(${pageViews.views})`))
        .limit(8),
      database.select({ invited: count() }).from(invitations).where(gte(invitations.createdAt, week)),
    ]);
  const queue = readQueue();
  return {
    members,
    questions: { newThisWeek: newQuestions, unansweredTotal: unanswered, answersThisWeek: newAnswers },
    openReports,
    assistantAiAnswersThisWeek: assistantAnswers,
    topPagesThisWeek: topPages,
    invitationsSentThisWeek: invited,
    reviewQueue: { waiting: queue.filter((item) => item.status === "pending").length, approvedTotal: queue.filter((item) => item.status === "approved").length },
  };
}

export type WeekItem = { kind: string; title: string; href: string; date?: string; note?: string };

/**
 * Everything new on AVRMD in the last 7 days, each with the page it should
 * link to, plus the topic and stage guides an article can point readers to.
 */
export async function weekItems() {
  const { getSignals } = await import("@/lib/signals");
  const { listQuestions } = await import("@/lib/db/repositories/questions");
  const { topics } = await import("@/lib/topics");
  const { stages } = await import("@/lib/stages");
  const now = Date.now();
  const week = now - 7 * 24 * 60 * 60 * 1000;
  const fortnight = now - 14 * 24 * 60 * 60 * 1000;
  const signals = getSignals();
  const thisWeek = signals.filter((signal) => new Date(signal.discoveredAt).getTime() >= week);
  const lastWeek = signals.filter((signal) => {
    const at = new Date(signal.discoveredAt).getTime();
    return at >= fortnight && at < week;
  });
  const byCategory = (list: typeof signals) =>
    Object.fromEntries(["regulatory", "research", "trial", "industry"].map((category) => [category, list.filter((signal) => signal.category === category).length]));

  const items: WeekItem[] = [];
  for (const signal of thisWeek.filter((item) => item.sourceId === "fda-xr-device-list").slice(0, 8)) {
    items.push({ kind: "New FDA AR/VR authorization", title: signal.headline, href: "/clearances", date: signal.publishedAt ?? undefined });
  }
  const rest = thisWeek
    .filter((item) => item.sourceId !== "fda-xr-device-list")
    .sort((a, b) => (b.publishedAt ?? b.discoveredAt).localeCompare(a.publishedAt ?? a.discoveredAt));
  for (const signal of rest.slice(0, 30)) {
    items.push({
      kind: { research: "Paper", trial: "Clinical trial", regulatory: "Regulatory filing", industry: "Industry news" }[signal.category],
      title: signal.headline,
      href: signal.promotedSlug ? `/entities/${signal.promotedSlug}` : signal.url,
      date: signal.publishedAt ?? undefined,
      note: signal.sourceLabel,
    });
  }
  for (const item of readQueue().filter((entry) => entry.status === "approved" && entry.slug && entry.decidedAt && new Date(entry.decidedAt).getTime() >= week)) {
    items.push({ kind: "New AVRMD record", title: item.title, href: `/entities/${item.slug}` });
  }
  const questions = await listQuestions().catch(() => []);
  for (const question of questions.filter((entry) => entry.createdAt.getTime() >= week).slice(0, 8)) {
    items.push({ kind: question.answerCount ? "Community question" : "Unanswered community question", title: question.title, href: `/questions/${question.id}` });
  }
  const guides: WeekItem[] = [
    ...topics.map((topic) => ({ kind: "Topic guide", title: topic.name, href: `/topics/${topic.slug}` })),
    ...stages.map((stage) => ({ kind: "Stage guide", title: `${stage.name} stage`, href: `/stages/${stage.slug}` })),
    { kind: "Page", title: "Papers & news feed", href: "/signals" },
    { kind: "Page", title: "FDA AR/VR device list", href: "/clearances" },
    { kind: "Page", title: "Ask the community", href: "/ask" },
    { kind: "Page", title: "Recorded talks and lectures", href: "/talks" },
  ];
  return { items, guides, trend: { thisWeek: byCategory(thisWeek), previousWeek: byCategory(lastWeek) } };
}
