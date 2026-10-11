import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { rateLimiter } from "@/lib/rate-limit";
import { autoAssignAgentTasks } from "@/lib/agents/auto";
import { runQueuedAgentTasks } from "@/lib/agents/runner";

const perEditor = rateLimiter("agents:run", 10, 60 * 60_000);

/** "Run routines now": what the scheduled worker does, on demand. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  if (await perEditor(user.id)) return NextResponse.json({ ok: false, message: "Ran recently. Try again later." }, { status: 429 });
  const created = await autoAssignAgentTasks();
  after(() => runQueuedAgentTasks(10));
  return NextResponse.json({ ok: true, message: created ? `${created} new task${created === 1 ? "" : "s"} assigned; working on them now.` : "Nothing new to assign; working on any queued tasks." });
}
