import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdministrator } from "@/lib/auth/roles";
import { updateAgentSettings } from "@/lib/db/repositories/agent-tasks";
import { getAgent } from "@/lib/agents/team";

const bodySchema = z.object({
  agentId: z.string().max(40),
  enabled: z.boolean().optional(),
  autoAssign: z.boolean().optional(),
  dailyLimit: z.number().int().min(0).max(200).optional(),
});

/** Administrators switch agents on and off and set their limits. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdministrator(user)) return NextResponse.json({ ok: false, message: "Only an administrator can change the team." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !getAgent(parsed.data.agentId)) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 422 });
  const { agentId, ...fields } = parsed.data;
  const settings = await updateAgentSettings(agentId, fields);
  return NextResponse.json({ ok: true, settings });
}
