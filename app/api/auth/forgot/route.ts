import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, devLink, siteUrl } from "@/lib/auth/flow";
import { createRateLimiter } from "@/lib/rate-limit";
import { getUserByEmail } from "@/lib/db/repositories/users";
import { createVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { sendPasswordReset } from "@/lib/mail";

const perIp = createRateLimiter(10, 15 * 60_000);
const perEmail = createRateLimiter(3, 15 * 60_000);

const bodySchema = z.object({ email: z.string().trim().email("Enter a valid email address.").max(254) });

/** Same answer whether or not the address has an account. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 422 });
  }
  const email = parsed.data.email.toLowerCase();
  if (perIp(clientIp(request)) || perEmail(email)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  let link: string | undefined;
  let sent = true;
  if (await getUserByEmail(email)) {
    const { raw } = await createVerificationToken(email, "reset_password");
    link = `${siteUrl(request)}/sign-in/reset?token=${raw}`;
    sent = await sendPasswordReset(email, link);
  }

  return NextResponse.json({
    ok: true,
    message: `If ${email} has an account, a link to choose a new password is on its way.`,
    devLink: link ? devLink(link, sent) : undefined,
  });
}
