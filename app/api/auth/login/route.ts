import { NextResponse } from "next/server";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/guards";
import { clientIp, signedInJson, siteUrl } from "@/lib/auth/flow";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { createRateLimiter } from "@/lib/rate-limit";
import { getUserByEmail } from "@/lib/db/repositories/users";
import { createVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { sendConfirmEmail } from "@/lib/mail";

// Per address and per IP, so one account can't be guessed at from many
// places and one place can't spray many accounts.
const perEmail = createRateLimiter(8, 15 * 60_000);
const perIp = createRateLimiter(30, 15 * 60_000);

const bodySchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().max(200),
  next: z.string().optional(),
});

const wrong = () =>
  NextResponse.json({ ok: false, message: "That email and password don't match an account." }, { status: 401 });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return wrong();
  const email = parsed.data.email.toLowerCase();

  if (perEmail(email) || perIp(clientIp(request))) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Wait 15 minutes, or reset your password." }, { status: 429 });
  }

  const user = await getUserByEmail(email);
  if (!user?.passwordHash) {
    // Same cost as a real check, so timing doesn't reveal who is registered.
    await burnPasswordCheck(parsed.data.password);
    return wrong();
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return wrong();

  // Only someone who knows the password learns that the address is unconfirmed.
  if (!user.emailVerifiedAt) {
    const { raw } = await createVerificationToken(email, "verify_email");
    await sendConfirmEmail(email, `${siteUrl(request)}/sign-in/confirm?token=${raw}`);
    return NextResponse.json(
      { ok: false, message: `Confirm your email first. We sent a new link to ${email}.` },
      { status: 403 },
    );
  }

  return signedInJson(user.id, safeNextPath(parsed.data.next));
}
