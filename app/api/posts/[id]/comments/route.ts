import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { isUuid } from "@/lib/ids";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { addComment, getPost, listComments } from "@/lib/db/repositories/posts";

const rateLimited = rateLimiter("comment", 10, 60_000);

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const comments = await listComments(id);
  return NextResponse.json({ ok: true, comments });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to comment." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const { id } = await params;

  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  if (!(await getPost(id))) {
    return NextResponse.json({ ok: false, message: "Post not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Comment can't be empty." }, { status: 422 });
  }

  const comment = await addComment(id, user.id, parsed.data.body);
  return NextResponse.json({ ok: true, comment });
}
