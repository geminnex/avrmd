import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadPostImage } from "@/lib/storage";

const windowMs = 60_000;
const maxPerWindow = 10;
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many uploads." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No file provided." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadPostImage(buffer, user.id);

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, url: result.url, mimeType: result.mimeType });
}
