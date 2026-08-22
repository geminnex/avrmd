import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createPost, listRecentPosts } from "@/lib/db/repositories/posts";
import { getUserMembership } from "@/lib/db/repositories/memberships";
import { getEntity } from "@/lib/catalog";

const windowMs = 60_000;
const maxPerWindow = 6;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxPerWindow;
}

const bodySchema = z.object({
  body: z.string().trim().min(1).max(3000),
  entitySlug: z.string().trim().max(180).optional(),
  media: z
    .array(z.object({ url: z.string().url(), mimeType: z.string() }))
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

  if (rateLimited(user.id)) {
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

  if (parsed.data.entitySlug) {
    // Posting as a group requires real standing, checked server-side — never
    // just hidden in the UI. There is no path yet that creates a membership
    // row (claiming is still a preview form), so this branch is exercised
    // only once claims are real, but the guard is correct from day one.
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

  const post = await createPost({
    authorId: user.id,
    body: parsed.data.body,
    entitySlug: parsed.data.entitySlug,
    mediaUrls: parsed.data.media,
  });

  return NextResponse.json({ ok: true, post });
}
