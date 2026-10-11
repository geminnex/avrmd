import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { sendMail } from "@/lib/mail";
import { rateLimiter } from "@/lib/rate-limit";
import { createReport, getReportTarget, reportableTypes, reportReasons } from "@/lib/db/repositories/reports";

const rateLimited = rateLimiter("report", 10, 60 * 60_000);

const bodySchema = z.object({
  resourceType: z.enum(reportableTypes),
  resourceId: z.string(),
  reason: z.enum(Object.keys(reportReasons) as [keyof typeof reportReasons, ...(keyof typeof reportReasons)[]]),
  details: z.string().trim().max(1000).optional(),
});

/** Members flag content; editors get an email and decide in /workspace. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sign in to report." }, { status: 401 });
  if (await rateLimited(user.id)) return NextResponse.json({ ok: false, message: "Too many reports. Try later." }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isUuid(parsed.data.resourceId)) {
    return NextResponse.json({ ok: false, message: "Invalid report." }, { status: 422 });
  }
  const target = await getReportTarget(parsed.data.resourceType, parsed.data.resourceId);
  if (!target) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await createReport({ reporterId: user.id, ...parsed.data });

  const editors = process.env.EDITOR_EMAIL ?? process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1];
  const base = process.env.AUTH_URL ?? "";
  if (editors) {
    after(() =>
      sendMail({
        to: editors,
        subject: `AVRMD report: ${reportReasons[parsed.data.reason]}`,
        lines: [
          `${user.email} reported a ${parsed.data.resourceType}: ${reportReasons[parsed.data.reason]}.`,
          ...(parsed.data.details ? ["", `"${parsed.data.details}"`] : []),
          "",
          target.text.slice(0, 600),
        ],
        link: { label: "Review in the workspace", url: `${base}/workspace?tab=reports` },
      }),
    );
  }
  return NextResponse.json({ ok: true, message: "Thanks — an editor will look at it." });
}
