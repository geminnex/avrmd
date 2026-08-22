import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserByHandle, updateUserProfile } from "@/lib/db/repositories/users";

const handlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(handlePattern, "Use lowercase letters, numbers, and hyphens only."),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
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

  const { handle, displayName, bio } = parsed.data;

  const existing = await getUserByHandle(handle);
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ ok: false, message: "That handle is taken." }, { status: 409 });
  }

  const updated = await updateUserProfile(user.id, {
    handle,
    displayName: displayName || null,
    bio: bio || null,
  });

  return NextResponse.json({ ok: true, handle: updated.handle });
}
