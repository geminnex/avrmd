import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import { rateLimiter } from "@/lib/rate-limit";
import { getQuestion } from "@/lib/db/repositories/questions";
import { createAgentTask } from "@/lib/db/repositories/agent-tasks";
import { getAgent } from "@/lib/agents/team";
import { runAgentTask } from "@/lib/agents/runner";

const perEditor = rateLimiter("agents:assign", 60, 24 * 60 * 60_000);

const bodySchema = z.object({
  agentId: z.string().max(40),
  instructions: z.string().trim().max(1000).optional(),
  questionId: z.string().optional(),
  reportId: z.string().optional(),
  email: z.string().trim().email("Enter a valid email address.").max(254).optional().or(z.literal("")),
  name: z.string().trim().max(120).optional(),
  about: z.string().trim().max(1000).optional(),
  topic: z.string().trim().max(300).optional(),
});

const bad = (message: string) => NextResponse.json({ ok: false, message }, { status: 422 });

/** Staff assign a task to an agent; it starts right away and lands in review. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Check the form.");
  const body = parsed.data;
  const agent = getAgent(body.agentId);
  if (!agent) return bad("Choose an agent.");
  if (await perEditor(user.id)) return NextResponse.json({ ok: false, message: "That's the day's limit of assignments." }, { status: 429 });

  let title: string;
  let input: Record<string, unknown>;
  switch (agent.kind) {
    case "draft_answer": {
      const question = body.questionId && isUuid(body.questionId) ? await getQuestion(body.questionId) : undefined;
      if (!question) return bad("Choose a question.");
      title = `Answer: ${question.title}`;
      input = { questionId: question.id };
      break;
    }
    case "assess_report":
      if (!body.reportId || !isUuid(body.reportId)) return bad("Choose a report.");
      title = "Assess a report";
      input = { reportId: body.reportId };
      break;
    case "draft_invitation":
      if (!body.email) return bad("Enter the invitee's email.");
      title = `Invitation note for ${body.name || body.email}`;
      input = { email: body.email.toLowerCase(), name: body.name ?? "", about: body.about ?? "" };
      break;
    case "site_report":
      title = `Site report, ${new Date().toISOString().slice(0, 10)}`;
      input = {};
      break;
    case "weekly_article":
      title = `This week in medical XR, ${new Date().toISOString().slice(0, 10)}`;
      input = {};
      break;
    case "research_brief":
      if (!body.topic) return bad("Enter a topic.");
      title = `Briefing: ${body.topic}`;
      input = { topic: body.topic };
      break;
  }

  const task = await createAgentTask({
    agentId: agent.id,
    kind: agent.kind,
    title: title.slice(0, 200),
    input,
    instructions: body.instructions,
    createdById: user.id,
  });
  after(() => runAgentTask(task.id));
  return NextResponse.json({ ok: true, id: task.id, message: `${agent.name} is on it.` }, { status: 201 });
}
