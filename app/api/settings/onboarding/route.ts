import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isFacetName, isPipelineStage, isProfessionalRole, isTopicSlug } from "@/lib/member-profile";
import { rateLimiter } from "@/lib/rate-limit";
import { getDatabase } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const rateLimited = rateLimiter("onboarding", 10, 60_000);

const bodySchema = z.object({
  skip: z.boolean().optional(),
  roles: z.array(z.string()).max(4).default([]),
  stages: z.array(z.string()).max(8).default([]),
  canHelpWith: z.array(z.string()).max(10).default([]),
  topicInterests: z.array(z.string()).max(6).default([]),
});

/** Saves the welcome step (or records that it was skipped) — once. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sign in first." }, { status: 401 });
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 422 });
  const data = parsed.data;

  const fields = data.skip
    ? {}
    : {
        // Only the site's own vocabularies; anything else is dropped.
        roles: data.roles.filter(isProfessionalRole),
        stages: data.stages.filter(isPipelineStage),
        canHelpWith: data.canHelpWith.filter(isFacetName),
        topicInterests: data.topicInterests.filter(isTopicSlug),
      };
  await getDatabase()
    .update(users)
    .set({ ...fields, onboardedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
