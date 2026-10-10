import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  findUnknownQuestionTag,
  maxRoutedPerMemberPerDay,
  questionTagCount,
  questionTagLimits,
  routeQuestion,
} from "@/lib/questions";
import { rateLimiter } from "@/lib/rate-limit";
import {
  createQuestion,
  findQuestionByTitle,
  listHelperCandidates,
} from "@/lib/db/repositories/questions";
import {
  createNotifications,
  findRoutingSaturated,
} from "@/lib/db/repositories/notifications";

const rateLimited = rateLimiter("question:rateLimited", 3, 60_000);

const bodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(12, "Make the question at least 12 characters.")
    .max(200, "Keep the question under 200 characters."),
  body: z.string().trim().max(5000, "Keep the details under 5,000 characters.").optional(),
  topicSlugs: z.array(z.string()).max(questionTagLimits.topicSlugs).optional(),
  stages: z.array(z.string()).max(questionTagLimits.stages).optional(),
  facets: z.array(z.string()).max(questionTagLimits.facets).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to ask." }, { status: 401 });
  }

  if (await rateLimited(user.id)) {
    return NextResponse.json(
      { ok: false, message: "Too many questions. Wait a minute." },
      { status: 429 },
    );
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
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 422 },
    );
  }

  const tags = {
    topicSlugs: [...new Set(parsed.data.topicSlugs ?? [])],
    stages: [...new Set(parsed.data.stages ?? [])],
    facets: [...new Set(parsed.data.facets ?? [])],
  };

  const unknown = findUnknownQuestionTag(tags);
  if (unknown) {
    return NextResponse.json({ ok: false, message: unknown }, { status: 422 });
  }
  if (questionTagCount(tags) === 0) {
    return NextResponse.json(
      { ok: false, message: "Add at least one tag — tags are how the right people see it." },
      { status: 422 },
    );
  }

  if (await findQuestionByTitle(user.id, parsed.data.title)) {
    return NextResponse.json(
      { ok: false, message: "You have already asked that question." },
      { status: 409 },
    );
  }

  const question = await createQuestion({
    authorId: user.id,
    title: parsed.data.title,
    body: parsed.data.body ?? "",
    ...tags,
  });

  // Routing is best effort: the question is already posted and readable,
  // so a failure here must not turn into an error for the asker.
  let routedCount = 0;
  try {
    const candidates = await listHelperCandidates();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const saturated = await findRoutingSaturated(
      candidates.map((candidate) => candidate.userId),
      since,
      maxRoutedPerMemberPerDay,
    );
    const routed = routeQuestion(tags, candidates, { authorId: user.id, saturated });
    await createNotifications(
      routed.map((match) => ({
        userId: match.userId,
        kind: "question_routed",
        actorId: user.id,
        questionId: question.id,
        matched: match.helpMatches,
      })),
    );
    routedCount = routed.length;
    const asker = user.displayName || (user.handle ? `@${user.handle}` : "A member");
    after(() =>
      import("@/lib/notify-email").then(({ emailNotifications }) =>
        emailNotifications(
          routed.map((match) => ({ userId: match.userId, kind: "question_routed" as const, questionId: question.id, matched: match.helpMatches })),
          asker,
        ),
      ),
    );
  } catch (error) {
    console.error("Question routing failed", error);
  }

  return NextResponse.json({ ok: true, id: question.id, routedCount }, { status: 201 });
}
