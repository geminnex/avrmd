import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { follow, isFollowing, unfollow } from "@/lib/db/repositories/follows";
import { getEntity } from "@/lib/catalog";
import { getUserById } from "@/lib/db/repositories/users";

const rateLimited = rateLimiter("follow", 30, 60_000);

const bodySchema = z.object({
  followingType: z.enum(["user", "entity"]),
  followingId: z.string().trim().min(1).max(180),
});

/** Only allow following something that actually exists. */
async function targetExists(type: "user" | "entity", id: string) {
  if (type === "entity") return Boolean(getEntity(id));
  return Boolean(await getUserById(id));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const parsed = bodySchema.safeParse({
    followingType: searchParams.get("type"),
    followingId: searchParams.get("id"),
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Missing type or id." }, { status: 422 });
  }

  // Anonymous visitors simply aren't following anything — no error needed.
  const following = user
    ? await isFollowing(user.id, parsed.data.followingType, parsed.data.followingId)
    : false;

  return NextResponse.json({ ok: true, following });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to follow." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Missing type or id." }, { status: 422 });
  }

  if (!(await targetExists(parsed.data.followingType, parsed.data.followingId))) {
    return NextResponse.json({ ok: false, message: "Nothing to follow there." }, { status: 404 });
  }

  // You can't follow yourself — the button would otherwise render on your
  // own profile and do something meaningless.
  if (parsed.data.followingType === "user" && parsed.data.followingId === user.id) {
    return NextResponse.json({ ok: false, message: "You can't follow yourself." }, { status: 422 });
  }

  await follow(user.id, parsed.data.followingType, parsed.data.followingId);
  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Missing type or id." }, { status: 422 });
  }

  await unfollow(user.id, parsed.data.followingType, parsed.data.followingId);
  return NextResponse.json({ ok: true, following: false });
}
