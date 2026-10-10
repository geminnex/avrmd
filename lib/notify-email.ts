import { inArray } from "drizzle-orm";
import { getDatabase } from "./db/client";
import { questions, users } from "./db/schema";
import { unsubscribeHeaders, unsubscribeUrl, type EmailKind } from "./email-prefs";
import { sendMail } from "./mail";

export type NotificationEmail = {
  userId: string;
  kind: "question_routed" | "answer_posted" | "answer_accepted";
  questionId: string;
  matched?: string[];
};

const prefFor: Record<NotificationEmail["kind"], EmailKind> = {
  question_routed: "questions",
  answer_posted: "answers",
  answer_accepted: "answers",
};

/**
 * Emails the same events as the in-app bell, to members who keep that kind
 * of email on and whose address is confirmed. Best effort: called after the
 * response is sent, and a failed send never affects the request.
 */
export async function emailNotifications(items: NotificationEmail[], actorName: string) {
  if (items.length === 0) return;
  const database = getDatabase();
  const recipients = await database
    .select({ id: users.id, email: users.email, prefs: users.emailPrefs, verified: users.emailVerifiedAt })
    .from(users)
    .where(inArray(users.id, [...new Set(items.map((item) => item.userId))]));
  const titles = await database
    .select({ id: questions.id, title: questions.title })
    .from(questions)
    .where(inArray(questions.id, [...new Set(items.map((item) => item.questionId))]));
  const base = process.env.AUTH_URL ?? "https://avrmd.cyalin.com";

  await Promise.all(
    items.map(async (item) => {
      const recipient = recipients.find((row) => row.id === item.userId);
      const kind = prefFor[item.kind];
      if (!recipient?.verified || recipient.prefs?.[kind] === false) return;
      const title = titles.find((row) => row.id === item.questionId)?.title ?? "a question";
      const subject =
        item.kind === "question_routed"
          ? `Can you help? "${title.slice(0, 80)}"`
          : item.kind === "answer_posted"
            ? `New answer to "${title.slice(0, 80)}"`
            : "Your answer helped";
      const lead =
        item.kind === "question_routed"
          ? `${actorName} asked a question about something you said you can help with${item.matched?.length ? ` (${item.matched.join(", ")})` : ""}:`
          : item.kind === "answer_posted"
            ? `${actorName} answered your question:`
            : `${actorName} marked your answer as the one that helped:`;
      await sendMail({
        to: recipient.email,
        subject,
        lines: [lead, "", title],
        link: { label: item.kind === "question_routed" ? "Read and answer" : "Open the question", url: `${base}/questions/${item.questionId}` },
        headers: unsubscribeHeaders(recipient.id, kind),
        footer: [
          item.kind === "question_routed"
            ? "You get these because your profile says you can help with this topic."
            : "You get these because you take part in this question.",
          `Stop these emails: ${unsubscribeUrl(recipient.id, kind)}`,
          `All email settings: ${base}/settings/profile#email`,
        ],
      });
    }),
  );
}
