import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";
import { inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { canModerate, isStaff } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import { getDatabase } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getAgentTask } from "@/lib/db/repositories/agent-tasks";
import { getQuestion } from "@/lib/db/repositories/questions";
import { getAgent, statusLabels } from "@/lib/agents/team";
import { loadContext } from "@/lib/agents/context";
import { workspaceCounts } from "@/lib/workspace-counts";
import { timeAgo } from "@/lib/time";
import { WorkspaceNav } from "@/components/workspace-nav";
import { TaskReview } from "@/components/agent-controls";

export const metadata: Metadata = { title: "AI task", robots: { index: false } };
export const dynamic = "force-dynamic";

const approveLabels: Record<string, string> = {
  draft_answer: "Approve and post answer",
  assess_report: "Approve decision",
  draft_invitation: "Approve and send invitation",
  site_report: "Mark as read",
  research_brief: "File briefing",
  weekly_article: "Approve and publish",
};

/** One task: what it was asked, what it produced, and the decision. */
export default async function AgentTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const task = await getAgentTask(id);
  if (!task) notFound();
  const agent = getAgent(task.agentId);
  const input = task.input as Record<string, string | undefined>;

  const people = [task.createdById, task.reviewedById].filter((value): value is string => Boolean(value));
  const [names, counts, context, question] = await Promise.all([
    people.length ? getDatabase().select({ id: users.id, email: users.email, name: users.displayName }).from(users).where(inArray(users.id, people)) : [],
    workspaceCounts(),
    task.kind === "assess_report" ? loadContext(task).catch((): Record<string, unknown> => ({})) : Promise.resolve({} as Record<string, unknown>),
    task.kind === "draft_answer" && input.questionId ? getQuestion(input.questionId) : Promise.resolve(undefined),
  ]);
  const who = (personId: string | null) => {
    const person = names.find((row) => row.id === personId);
    return person ? person.name || person.email : null;
  };
  const output = (task.output ?? {}) as Record<string, unknown>;
  const text = typeof output.text === "string" ? output.text : undefined;

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <Link className="member-back" href="/workspace/agents">
              <ArrowLeft size={14} /> AI team
            </Link>
            <span className="eyebrow">
              <Bot size={15} />
              {agent ? `${agent.name} · ${agent.role}` : task.agentId}
            </span>
            <h1 className="task-title">{task.title}</h1>
            <p>
              <b className={`task-status ${task.status}`}>{statusLabels[task.status]}</b> · assigned{" "}
              {task.createdById ? `by ${who(task.createdById) ?? "a former editor"}` : "by the routine"} {timeAgo(task.createdAt)}
              {task.reviewedAt ? ` · ${task.status} by ${who(task.reviewedById) ?? "a former editor"} ${timeAgo(task.reviewedAt)}` : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="shell review-body">
        <WorkspaceNav counts={counts} current="agents" showMembers={canModerate(user)} />

        <div className="member-detail-grid task-grid">
          <section className="review-section">
            <h2>Assignment</h2>
            <dl className="member-facts">
              {question && (
                <div>
                  <dt>Question</dt>
                  <dd>
                    <Link href={`/questions/${question.id}`}>{question.title}</Link>
                    {question.body && <p className="task-quote">{question.body.slice(0, 600)}</p>}
                  </dd>
                </div>
              )}
              {task.kind === "assess_report" && (
                <>
                  <div>
                    <dt>Reported for</dt>
                    <dd>
                      {String(context.reason ?? "—")}
                      {context.details ? ` — “${String(context.details)}”` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Content</dt>
                    <dd className="task-quote">{context.text ? String(context.text).slice(0, 1200) : "(already removed)"}</dd>
                  </div>
                </>
              )}
              {task.kind === "draft_invitation" && (
                <>
                  <div>
                    <dt>Invitee</dt>
                    <dd>
                      {input.name ? `${input.name} <${input.email}>` : input.email}
                    </dd>
                  </div>
                  <div>
                    <dt>Their work</dt>
                    <dd>{input.about || "—"}</dd>
                  </div>
                </>
              )}
              {task.kind === "research_brief" && (
                <div>
                  <dt>Topic</dt>
                  <dd>{input.topic}</dd>
                </div>
              )}
              <div>
                <dt>Instructions</dt>
                <dd>{task.instructions || "—"}</dd>
              </div>
              {agent && (
                <div>
                  <dt>Approving</dt>
                  <dd>{agent.onApprove}</dd>
                </div>
              )}
              {task.model && (
                <div>
                  <dt>Model</dt>
                  <dd>
                    {task.model}
                    {task.inputTokens ? ` · ${task.inputTokens + (task.outputTokens ?? 0)} tokens` : ""}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="review-section">
            <h2>Result</h2>
            {task.status === "queued" || task.status === "running" ? (
              <p className="queue-empty">{agent?.name ?? "The agent"} is working on it. Refresh in a moment.</p>
            ) : null}
            {task.error && (
              <div className={`form-message ${task.status === "failed" ? "error" : "warning"}`} role="alert">
                <span>{task.error}</span>
              </div>
            )}
            {task.kind === "assess_report" && output.recommendation ? (
              <dl className="member-facts">
                <div>
                  <dt>Recommends</dt>
                  <dd>
                    <strong>{output.recommendation === "hide" ? "Hide the content" : "Dismiss the report"}</strong>
                    {typeof output.confidence === "number" ? ` · ${Math.round(output.confidence * 100)}% sure` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Why</dt>
                  <dd>{String(output.reason ?? "")}</dd>
                </div>
              </dl>
            ) : null}
            {text !== undefined && task.status !== "review" && <pre className="task-output">{text}</pre>}
            {typeof output.confidence === "number" && task.kind === "draft_answer" && (
              <p className="queue-empty">{agent?.name} is {Math.round(output.confidence * 100)}% confident in this draft.</p>
            )}
            {task.reviewNote && <p className="queue-empty">Reviewer&apos;s note: {task.reviewNote}</p>}
            <TaskReview
              approveLabel={approveLabels[task.kind] ?? "Approve"}
              id={task.id}
              instructions={task.instructions}
              kind={task.kind}
              recommendation={typeof output.recommendation === "string" ? output.recommendation : undefined}
              status={task.status}
              text={text}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
