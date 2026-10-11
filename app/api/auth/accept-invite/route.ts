import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, signedInJson } from "@/lib/auth/flow";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { rateLimiter } from "@/lib/rate-limit";
import { acceptInvitation, peekInvitation } from "@/lib/db/repositories/invitations";
import { acceptInvitedUser, getUserByEmail } from "@/lib/db/repositories/users";
import { afterSignIn } from "@/lib/onboarding";
import { suspendedMessage } from "@/lib/auth/roles";

const perIp = rateLimiter("accept-invite:perIp", 10, 15 * 60_000);

const bodySchema = z.object({ token: z.string().min(1).max(200), password: z.string().max(200) });

const gone = () =>
  NextResponse.json(
    { ok: false, message: "This invitation has expired or was already used. Create an account from the sign-in page." },
    { status: 410 },
  );

/** The join page's form: choose a password and you are in. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Check the form." }, { status: 422 });
  if (await perIp(clientIp(request))) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const invitation = await peekInvitation(parsed.data.token);
  if (!invitation) return gone();
  // Checked before the link is spent, so an existing member can still use it later to find the sign-in page.
  if ((await getUserByEmail(invitation.email))?.emailVerifiedAt) {
    return NextResponse.json(
      { ok: false, message: "This address already has an account. Sign in instead.", signIn: true },
      { status: 409 },
    );
  }
  const problem = passwordProblem(parsed.data.password, invitation.email);
  if (problem) return NextResponse.json({ ok: false, message: problem }, { status: 422 });

  const passwordHash = await hashPassword(parsed.data.password);
  const used = await acceptInvitation(parsed.data.token);
  if (!used) return gone();
  const user = await acceptInvitedUser(used.email, passwordHash, used.name);
  if (!user) {
    return NextResponse.json({ ok: false, message: "This address already has an account. Sign in instead.", signIn: true }, { status: 409 });
  }
  if (user.suspendedAt) return NextResponse.json({ ok: false, message: suspendedMessage }, { status: 403 });
  return signedInJson(user.id, afterSignIn(user, "/"));
}
