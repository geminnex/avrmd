import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntity } from "@/lib/catalog";
import { createThread, listThreadsForEntity } from "@/lib/db/repositories/community";

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.object({ title: z.string().trim().min(5).max(200) });

const windowMs = 60_000;
const maxPerWindow = 5;
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

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const threads = await listThreadsForEntity(slug);
  return NextResponse.json({ ok: true, threads });
}

/** Anyone signed in can open a discussion — no membership required. Only replying as the group is gated. */
export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to start a discussion." }, { status: 401 });
  }

  const { slug } = await params;
  if (!getEntity(slug)) {
    return NextResponse.json({ ok: false, message: "Unknown record." }, { status: 404 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many threads. Wait a minute." }, { status: 429 });
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

  const thread = await createThread(slug, user.id, parsed.data.title);
  return NextResponse.json({ ok: true, thread });
}
