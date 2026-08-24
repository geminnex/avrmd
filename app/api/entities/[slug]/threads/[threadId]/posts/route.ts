import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { addThreadPost, getThread, listThreadPosts } from "@/lib/db/repositories/community";

type Params = { params: Promise<{ slug: string; threadId: string }> };

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function GET(_request: Request, { params }: Params) {
  const { threadId } = await params;
  const posts = await listThreadPosts(threadId);
  return NextResponse.json({ ok: true, posts });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to reply." }, { status: 401 });
  }

  const { slug, threadId } = await params;
  const thread = await getThread(threadId);
  if (!thread || thread.entitySlug !== slug) {
    return NextResponse.json({ ok: false, message: "Thread not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Reply can't be empty." }, { status: 422 });
  }

  const post = await addThreadPost(threadId, user.id, parsed.data.body);
  return NextResponse.json({ ok: true, post });
}
