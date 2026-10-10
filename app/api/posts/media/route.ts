import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadPostImage } from "@/lib/storage";

const rateLimited = rateLimiter("upload", 10, 60_000);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }

  if (await rateLimited(user.id)) {
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
