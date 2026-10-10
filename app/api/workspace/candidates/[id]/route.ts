import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { entityKinds } from "@/lib/catalog-types";
import { approveCandidate, decideCandidate } from "@/lib/review-store";

const strings = z.array(z.string().trim().min(1)).max(8);
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    fields: z.object({
      name: z.string().trim().min(2).max(120),
      kind: z.enum(entityKinds),
      typeLabel: z.string().trim().min(2).max(80),
      summary: z.string().trim().max(600),
      specialties: strings,
      useCases: strings,
      modalities: strings,
      stages: strings,
      geography: z.string().trim().max(80),
      maturity: z.string().trim().max(60),
    }),
  }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("restore") }),
]);

/** Editors only: approve (writes the catalog record), reject, or restore a dismissed item. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isStaff(user)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 422 });
  }
  const { id } = await params;

  if (parsed.data.action === "approve") {
    const result = approveCandidate(id, parsed.data.fields, user!.id);
    if (!result.ok) return NextResponse.json({ ok: false, message: result.problems.join("; ") }, { status: 422 });
    return NextResponse.json({ ok: true, slug: result.record.slug });
  }
  const done = decideCandidate(id, parsed.data.action === "reject" ? "rejected" : "pending", user!.id);
  return done ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
}
