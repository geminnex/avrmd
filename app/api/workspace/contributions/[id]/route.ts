import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import { setContributionStatus } from "@/lib/db/repositories/contributions";

const bodySchema = z.object({ status: z.enum(["approved", "rejected", "submitted"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isStaff(user)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 422 });
  const row = await setContributionStatus(id, parsed.data.status);
  return row ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
}
