import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import { resolveReport } from "@/lib/db/repositories/reports";

const bodySchema = z.object({ action: z.enum(["hide", "dismiss"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isStaff(user)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !parsed.success) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 422 });
  return (await resolveReport(id, parsed.data.action))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
}
