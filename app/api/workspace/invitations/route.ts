import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { siteUrl } from "@/lib/auth/flow";
import { rateLimiter } from "@/lib/rate-limit";
import { createInvitation } from "@/lib/db/repositories/invitations";
import { getUserByEmail } from "@/lib/db/repositories/users";
import { sendInvitation } from "@/lib/mail";

// Generous for founder-led outreach, small enough that a stolen editor session can't spam.
const perEditor = rateLimiter("invite:perEditor", 60, 24 * 60 * 60_000);

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  name: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1500).optional(),
});

/** Editors invite people by email. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 422 });
  }
  const email = parsed.data.email.toLowerCase();
  if ((await getUserByEmail(email))?.emailVerifiedAt) {
    return NextResponse.json({ ok: false, message: `${email} is already a member.` }, { status: 409 });
  }
  if (await perEditor(user.id)) {
    return NextResponse.json({ ok: false, message: "That's the day's limit of invitations. Try again tomorrow." }, { status: 429 });
  }

  const { raw } = await createInvitation({ ...parsed.data, email, invitedById: user.id });
  const url = `${siteUrl(request)}/join?token=${raw}`;
  const inviterName = user.displayName || "An AVRMD editor";
  const sent = await sendInvitation({ to: email, name: parsed.data.name, inviterName, inviterEmail: user.email, note: parsed.data.note, url });
  if (!sent) {
    return NextResponse.json({ ok: false, message: "The invitation was saved but the email didn't send. Check the mail settings." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, message: `Invitation sent to ${email}.` });
}
