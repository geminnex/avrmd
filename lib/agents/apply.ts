import { createAnswer, getQuestion } from "@/lib/db/repositories/questions";
import { createNotifications } from "@/lib/db/repositories/notifications";
import { getDatabase } from "@/lib/db/client";
import { moderationReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveReport } from "@/lib/db/repositories/reports";
import { createInvitation } from "@/lib/db/repositories/invitations";
import { getUserByEmail, type UserRecord } from "@/lib/db/repositories/users";
import { sendInvitation } from "@/lib/mail";
import type { AgentTask } from "@/lib/db/repositories/agent-tasks";
import { publishArticle } from "@/lib/db/repositories/articles";
import { splitArticleDraft, weekStart } from "@/lib/article-format";

export type Applied = { ok: true; message: string; href?: string } | { ok: false; message: string };

/**
 * What approving a task does, as the person who approved it. Checked again
 * at this moment: the question may have been hidden, the report closed, the
 * invitee may have joined since the draft was written.
 */
export async function applyAgentTask(
  task: AgentTask,
  reviewer: UserRecord,
  decision: { text?: string; recommendation?: "hide" | "dismiss" },
): Promise<Applied> {
  const input = task.input as Record<string, string | undefined>;
  const base = process.env.AUTH_URL ?? "https://avrmd.cyalin.com";
  switch (task.kind) {
    case "draft_answer": {
      const text = decision.text?.trim() ?? "";
      if (text.length < 10 || text.length > 5000) return { ok: false, message: "The answer must be 10 to 5,000 characters." };
      const question = input.questionId ? await getQuestion(input.questionId) : undefined;
      if (!question) return { ok: false, message: "That question is no longer visible." };
      const answer = await createAnswer({ questionId: question.id, authorId: reviewer.id, body: text });
      if (question.authorId !== reviewer.id) {
        await createNotifications([
          { userId: question.authorId, kind: "answer_posted", actorId: reviewer.id, questionId: question.id, answerId: answer.id },
        ]).catch(() => undefined);
        const name = reviewer.displayName || (reviewer.handle ? `@${reviewer.handle}` : "An editor");
        import("@/lib/notify-email")
          .then(({ emailNotifications }) => emailNotifications([{ userId: question.authorId, kind: "answer_posted", questionId: question.id }], name))
          .catch(() => undefined);
      }
      return { ok: true, message: "Answer posted under your name.", href: `/questions/${question.id}` };
    }
    case "assess_report": {
      const action = decision.recommendation;
      if (action !== "hide" && action !== "dismiss") return { ok: false, message: "Choose hide or dismiss." };
      const [report] = input.reportId
        ? await getDatabase().select().from(moderationReports).where(eq(moderationReports.id, input.reportId)).limit(1)
        : [];
      if (!report || report.status !== "submitted") return { ok: false, message: "That report was already handled." };
      await resolveReport(report.id, action);
      return { ok: true, message: action === "hide" ? "Content hidden and the report closed." : "Report dismissed." };
    }
    case "draft_invitation": {
      const email = (input.email ?? "").toLowerCase();
      if (!email) return { ok: false, message: "No email address on this task." };
      if ((await getUserByEmail(email))?.emailVerifiedAt) return { ok: false, message: `${email} is already a member.` };
      const note = decision.text?.trim().slice(0, 1500) ?? "";
      const { raw } = await createInvitation({ email, name: input.name, note, invitedById: reviewer.id });
      const sent = await sendInvitation({
        to: email,
        name: input.name,
        inviterName: reviewer.displayName || "An AVRMD editor",
        inviterEmail: reviewer.email,
        note,
        url: `${base}/join?token=${raw}`,
      });
      return sent
        ? { ok: true, message: `Invitation sent to ${email}.` }
        : { ok: false, message: "The invitation was saved but the email didn't send. Check the mail settings." };
    }
    case "weekly_article": {
      const draft = splitArticleDraft(decision.text ?? "");
      if (!draft.title || draft.title.length > 140) return { ok: false, message: "Start the draft with a title line (at most 140 characters)." };
      if (draft.body.length < 100) return { ok: false, message: "The article body is too short." };
      const article = await publishArticle({
        title: draft.title,
        summary: draft.summary.slice(0, 600),
        body: draft.body.slice(0, 20000),
        weekOf: weekStart(task.createdAt),
        draftedBy: task.agentId,
        publishedById: reviewer.id,
      });
      return { ok: true, message: "Published.", href: `/weekly/${article.slug}` };
    }
    default:
      return { ok: true, message: "Filed." };
  }
}
