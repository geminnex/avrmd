import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createRateLimiter } from "@/lib/rate-limit";
import { createAnswer, getQuestion } from "@/lib/db/repositories/questions";
import { createNotifications } from "@/lib/db/repositories/notifications";

const rateLimited = createRateLimiter(5);

const bodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(10, "Make the answer at least 10 characters.")
    .max(5000, "Keep the answer under 5,000 characters."),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to answer." }, { status: 401 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json(
      { ok: false, message: "Too many answers. Wait a minute." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the answer." },
      { status: 422 },
    );
  }

  const answer = await createAnswer({
    questionId: question.id,
    authorId: user.id,
    body: parsed.data.body,
  });

  if (question.authorId !== user.id) {
    try {
      await createNotifications([
        {
          userId: question.authorId,
          kind: "answer_posted",
          actorId: user.id,
          questionId: question.id,
          answerId: answer.id,
        },
      ]);
    } catch (error) {
      console.error("Answer notification failed", error);
    }
  }

  return NextResponse.json({ ok: true, id: answer.id }, { status: 201 });
}
