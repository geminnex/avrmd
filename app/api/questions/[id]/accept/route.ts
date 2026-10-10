import { after, NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnswer, getQuestion, setAcceptedAnswer } from "@/lib/db/repositories/questions";
import { createNotifications } from "@/lib/db/repositories/notifications";

const rateLimited = rateLimiter("accept", 20, 60_000);

const bodySchema = z.object({ answerId: z.string() });

/** The asker marks the answer that helped. Only the asker can. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }
  if (question.authorId !== user.id) {
    return NextResponse.json(
      { ok: false, message: "Only the person who asked can mark an answer." },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  const answer = parsed.success ? await getAnswer(question.id, parsed.data.answerId) : undefined;
  if (!answer) {
    return NextResponse.json({ ok: false, message: "Answer not found." }, { status: 404 });
  }

  await setAcceptedAnswer(question.id, answer.id);

  if (answer.authorId !== user.id) {
    try {
      await createNotifications([
        {
          userId: answer.authorId,
          kind: "answer_accepted",
          actorId: user.id,
          questionId: question.id,
          answerId: answer.id,
        },
      ]);
      const asker = user.displayName || (user.handle ? `@${user.handle}` : "A member");
      after(() =>
        import("@/lib/notify-email").then(({ emailNotifications }) =>
          emailNotifications([{ userId: answer.authorId, kind: "answer_accepted", questionId: question.id }], asker),
        ),
      );
    } catch (error) {
      console.error("Accept notification failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
