import { NextResponse } from "next/server";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/guards";
import { clientIp, devLink, siteUrl } from "@/lib/auth/flow";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { createRateLimiter } from "@/lib/rate-limit";
import { registerPasswordUser } from "@/lib/db/repositories/users";
import { createVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { sendAlreadyRegistered, sendConfirmEmail } from "@/lib/mail";

const perIp = createRateLimiter(10, 15 * 60_000);
const perEmail = createRateLimiter(3, 15 * 60_000);

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string(),
  next: z.string().optional(),
});

/**
 * The response is the same whether or not the address already has an
 * account, so this form can't be used to find out who is registered; the
 * difference goes to the inbox instead.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 422 });
  }
  const email = parsed.data.email.toLowerCase();
  const problem = passwordProblem(parsed.data.password, email);
  if (problem) return NextResponse.json({ ok: false, message: problem }, { status: 422 });

  if (perIp(clientIp(request)) || perEmail(email)) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const base = siteUrl(request);
  const result = await registerPasswordUser(email, await hashPassword(parsed.data.password));

  let link: string | undefined;
  let sent: boolean;
  if (result.status === "exists") {
    sent = await sendAlreadyRegistered(email, `${base}/sign-in`, `${base}/sign-in?mode=forgot`);
  } else {
    const { raw } = await createVerificationToken(email, "verify_email");
    const next = safeNextPath(parsed.data.next);
    link = `${base}/sign-in/confirm?token=${raw}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
    sent = await sendConfirmEmail(email, link);
  }

  if (!sent && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, message: "We couldn't send the confirmation email. Try again shortly." }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    message: `We sent a confirmation link to ${email}. Open it to finish creating your account.`,
    devLink: link ? devLink(link, sent) : undefined,
  });
}
