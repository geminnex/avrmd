import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findUnknownQuestionTag, routeQuestion } from "@/lib/questions";
import { listHelperCandidates } from "@/lib/db/repositories/questions";

/**
 * How many members a question with these tags would reach, so the asker can
 * see while tagging that a facet is what puts it in front of people. A
 * count only — who they are is for the question page to show.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const read = (key: string) => url.searchParams.getAll(key).filter(Boolean);
  const tags = { topicSlugs: read("topic"), stages: read("stage"), facets: read("facet") };

  if (findUnknownQuestionTag(tags)) {
    return NextResponse.json({ ok: false, reach: 0 }, { status: 422 });
  }

  try {
    const user = await getCurrentUser();
    const candidates = await listHelperCandidates();
    // The daily cap is left out on purpose: this estimates fit, not delivery.
    const reach = routeQuestion(tags, candidates, { authorId: user?.id ?? "" }).length;
    return NextResponse.json({ ok: true, reach });
  } catch {
    return NextResponse.json({ ok: false, reach: null }, { status: 503 });
  }
}
