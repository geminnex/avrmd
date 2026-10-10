import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { isUuid } from "@/lib/ids";
import { getCurrentUser } from "@/lib/auth/session";
import { getPost, hasLiked, likePost, unlikePost } from "@/lib/db/repositories/posts";

const rateLimited = rateLimiter("like", 60, 60_000);

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const { id } = await params;

  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  if (!(await getPost(id))) {
    return NextResponse.json({ ok: false, message: "Post not found." }, { status: 404 });
  }

  const alreadyLiked = await hasLiked(id, user.id);
  if (alreadyLiked) {
    await unlikePost(id, user.id);
  } else {
    await likePost(id, user.id);
  }

  return NextResponse.json({ ok: true, liked: !alreadyLiked });
}
