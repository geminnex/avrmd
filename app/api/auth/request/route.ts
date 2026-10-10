import { NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateUser } from "@/lib/db/repositories/users";
import { createVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { sendMagicLink } from "@/lib/mail";

const requestSchema = z.object({ email: z.string().trim().email().max(254) });

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

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 422 });
  }

  // Rate-limit by IP and by the email itself, so one address can't be
  // hammered from many IPs and one IP can't fan out across many addresses.
  if (rateLimited(`ip:${ip}`) || rateLimited(`email:${parsed.data.email.toLowerCase()}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  await findOrCreateUser(parsed.data.email);
  const { raw } = await createVerificationToken(parsed.data.email);

  const base = process.env.AUTH_URL ?? new URL(request.url).origin;
  const url = `${base}/api/auth/verify?token=${raw}`;

  const result = await sendMagicLink(parsed.data.email, url);

  // The on-screen link is a local-development convenience only. Showing it
  // in production would let anyone sign in as anyone just by typing their
  // address, so there a failed send is an error, never a fallback.
  if (!result.sent && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, message: "We couldn't send the sign-in email. Try again in a few minutes." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.sent
      ? "Check your email for a sign-in link. It expires in 15 minutes."
      : "Email delivery isn't configured in development, so here is your link directly.",
    devLink: result.sent ? undefined : url,
  });
}
