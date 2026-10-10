import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createPost, listRecentPosts } from "@/lib/db/repositories/posts";
import { getUserMembership } from "@/lib/db/repositories/memberships";
import { getEntity } from "@/lib/catalog";
import { ownUploadMimeType } from "@/lib/storage";

const rateLimited = rateLimiter("post", 6, 60_000);

const bodySchema = z.object({
  body: z.string().trim().min(1).max(3000),
  entitySlug: z.string().trim().max(180).optional(),
  kind: z.enum(["update", "blog"]).optional(),
  media: z
    .array(z.object({ url: z.string().url(), mimeType: z.string().optional() }))
    .max(4)
    .optional(),
});

export async function GET() {
  const posts = await listRecentPosts(25);
  return NextResponse.json({ ok: true, posts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to post." }, { status: 401 });
  }

  if (await rateLimited(user.id)) {
    return NextResponse.json(
      { ok: false, message: "Too many posts. Wait a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 422 },
    );
  }

  if (parsed.data.kind === "blog" && !parsed.data.entitySlug) {
    return NextResponse.json(
      { ok: false, message: "A blog post must belong to a record." },
      { status: 422 },
    );
  }

  if (parsed.data.entitySlug) {
    // Posting as a group requires real standing, checked server-side — never
    // just hidden in the UI. Standing comes from scripts/grant-membership.mjs
    // today, ahead of a full claim-review workflow.
    if (!getEntity(parsed.data.entitySlug)) {
      return NextResponse.json({ ok: false, message: "Unknown record." }, { status: 404 });
    }
    const membership = await getUserMembership(user.id, parsed.data.entitySlug);
    if (!membership) {
      return NextResponse.json(
        { ok: false, message: "You don't have posting rights for that record." },
        { status: 403 },
      );
    }
  }

  // Only images this member uploaded here; the type comes from our own key.
  const media: { url: string; mimeType: string }[] = [];
  for (const item of parsed.data.media ?? []) {
    const mimeType = ownUploadMimeType(item.url, user.id);
    if (!mimeType) {
      return NextResponse.json(
        { ok: false, message: "Images must be uploaded here first." },
        { status: 422 },
      );
    }
    media.push({ url: item.url, mimeType });
  }

  const post = await createPost({
    authorId: user.id,
    body: parsed.data.body,
    entitySlug: parsed.data.entitySlug,
    kind: parsed.data.kind,
    mediaUrls: media,
  });

  return NextResponse.json({ ok: true, post });
}
