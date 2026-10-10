import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntity } from "@/lib/catalog";
import { createContribution } from "@/lib/db/repositories/contributions";
import { getMembersForEntity } from "@/lib/db/repositories/memberships";
import { getUserById } from "@/lib/db/repositories/users";
import { sendMail } from "@/lib/mail";
import { rateLimiter } from "@/lib/rate-limit";
import { intakeLabels, validateIntake, type IntakeRequest } from "@/lib/workflows";

const rateLimited = rateLimiter("intake:rateLimited", 5, 60 * 60_000);

/** Where submissions, claims and promotion enquiries are sent. */
function editorAddress() {
  if (process.env.EDITOR_EMAIL) return process.env.EDITOR_EMAIL;
  const from = process.env.SMTP_FROM ?? "";
  return from.match(/<([^>]+)>/)?.[1] ?? (from.includes("@") ? from : null);
}

function describe(data: IntakeRequest): string[] {
  return Object.entries(data)
    .filter(([key]) => !["type", "attestation", "noPhi", "website"].includes(key))
    .map(([key, value]) => `${key}: ${String(value)}`);
}

/**
 * Every form on the site lands here. Nothing is accepted from a visitor who
 * isn't signed in: it gives editors someone to reply to and keeps the forms
 * from becoming a spam relay. Each request is stored, then emailed.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to send this." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  // A filled honeypot means a bot; answer as if it worked.
  if (body && typeof body === "object" && (body as { website?: string }).website) {
    return NextResponse.json({ ok: true, message: "Received." });
  }

  const result = validateIntake(body);
  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Please correct the highlighted fields.",
        issues: result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
      { status: 422 },
    );
  }
  const data = result.data;
  const site = process.env.AUTH_URL ?? "";

  if (data.type === "inquiry") {
    // Only records with a verified representative take inquiries; the
    // message goes to them, with the sender as reply-to.
    const entity = getEntity(data.entitySlug);
    const members = entity ? await getMembersForEntity(entity.slug) : [];
    if (!entity || members.length === 0) {
      return NextResponse.json(
        { ok: false, message: "This organization has no verified representative to receive messages yet." },
        { status: 409 },
      );
    }
    await createContribution({ userId: user.id, kind: "inquiry", entitySlug: entity.slug, payload: data });
    const recipients = await Promise.all(members.map((member) => getUserById(member.membership.userId)));
    await Promise.all(
      recipients
        .filter((recipient) => recipient?.email)
        .map((recipient) =>
          sendMail({
            to: recipient!.email,
            replyTo: data.senderEmail,
            subject: `AVRMD inquiry about ${entity.name}`,
            lines: [
              `${data.senderName}${data.organization ? ` (${data.organization})` : ""} sent this through ${entity.name}'s AVRMD record. Reply to this email to answer them directly.`,
              "",
              data.message,
            ],
          }),
        ),
    );
    return NextResponse.json({
      ok: true,
      message: `Sent to ${entity.name}'s verified representative. Replies come to ${data.senderEmail}.`,
    });
  }

  const saved = await createContribution({
    userId: user.id,
    kind: data.type,
    entitySlug: null,
    payload: { ...data, accountEmail: user.email },
  });

  const editors = editorAddress();
  const replyTo = "contactEmail" in data ? data.contactEmail : "workEmail" in data ? data.workEmail : user.email;
  if (editors) {
    await sendMail({
      to: editors,
      replyTo,
      subject: `AVRMD ${intakeLabels[data.type].toLowerCase()} from ${user.email}`,
      lines: [
        `A new ${intakeLabels[data.type].toLowerCase()} arrived (id ${saved.id}).`,
        `Account: ${user.email}${user.handle ? ` (${site}/members/${user.handle})` : ""}`,
        "",
        ...describe(data),
      ],
    });
  }

  return NextResponse.json({
    ok: true,
    requestId: saved.id,
    message: `Received. An editor reviews every ${intakeLabels[data.type].toLowerCase()} and replies to ${replyTo} by email.`,
  });
}
