import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canModerate, isAdministrator, isStaff } from "@/lib/auth/roles";
import { team, statusLabels } from "@/lib/agents/team";
import { agentTaskCounts, getAgentSettings, listAgentTasks, type AgentTask } from "@/lib/db/repositories/agent-tasks";
import { listQuestions } from "@/lib/db/repositories/questions";
import { listOpenReports, reportReasons } from "@/lib/db/repositories/reports";
import { workspaceCounts } from "@/lib/workspace-counts";
import { timeAgo } from "@/lib/time";
import { WorkspaceNav } from "@/components/workspace-nav";
import { AgentSettingsControls, AssignTaskForm, RunRoutinesButton } from "@/components/agent-controls";

export const metadata: Metadata = { title: "AI team", robots: { index: false } };
export const dynamic = "force-dynamic";

const views = {
  review: { label: "Needs review", status: ["review"] },
  active: { label: "In progress", status: ["queued", "running"] },
  failed: { label: "Failed", status: ["failed"] },
  done: { label: "Done", status: ["approved", "rejected", "cancelled"] },
  all: { label: "All", status: [] },
} as const satisfies Record<string, { label: string; status: AgentTask["status"][] }>;
type View = keyof typeof views;

type AgentsPageProps = { searchParams: Promise<{ view?: string; agent?: string }> };

/** The AI operations team: who does what, what they are working on, and what waits for a person. */
export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const params = await searchParams;
  const view: View = params.view && params.view in views ? (params.view as View) : "review";
  const agentFilter = team.some((agent) => agent.id === params.agent) ? params.agent : undefined;
  const admin = isAdministrator(user);

  const [settings, taskCounts, tasks, questions, reports, counts] = await Promise.all([
    getAgentSettings(),
    agentTaskCounts(),
    listAgentTasks({ status: [...views[view].status], agentId: agentFilter, limit: 60 }),
    listQuestions().catch(() => []),
    listOpenReports().catch(() => []),
    workspaceCounts(),
  ]);
  const anyAuto = team.some((agent) => settings[agent.id].autoAssign);
  const viewHref = (target: View) => `/workspace/agents?view=${target}${agentFilter ? `&agent=${agentFilter}` : ""}`;

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <span className="eyebrow">
              <Bot size={15} />
              Admin
            </span>
            <h1>AI team</h1>
            <p>
              Six agents that help run AVRMD. They only draft: nothing they write reaches members until
              someone here approves it, and approving applies it under that person&apos;s name.
            </p>
          </div>
        </div>
      </section>

      <div className="shell review-body">
        <WorkspaceNav counts={counts} current="agents" showMembers={canModerate(user)} />

        <section className="agent-grid">
          {team.map((agent) => {
            const setting = settings[agent.id];
            const count = taskCounts[agent.id] ?? {};
            return (
              <article className={setting.enabled ? "agent-card" : "agent-card off"} key={agent.id}>
                <header>
                  <span className="agent-avatar" aria-hidden="true">
                    {agent.name[0]}
                  </span>
                  <span>
                    <strong>{agent.name}</strong>
                    <small>{agent.role}</small>
                  </span>
                  <em className={setting.enabled ? "agent-state on" : "agent-state"}>{setting.enabled ? (setting.autoAssign ? "On · auto" : "On") : "Off"}</em>
                </header>
                <p>{agent.description}</p>
                <dl>
                  <div>
                    <dt>When approved</dt>
                    <dd>{agent.onApprove}</dd>
                  </div>
                  {agent.routine && (
                    <div>
                      <dt>Routine</dt>
                      <dd>{agent.routine}</dd>
                    </div>
                  )}
                </dl>
                <div className="agent-numbers">
                  <Link href={`/workspace/agents?view=review&agent=${agent.id}`}>
                    <b>{count.review ?? 0}</b> to review
                  </Link>
                  <span>
                    <b>{count.today ?? 0}</b>/{setting.dailyLimit} today
                  </span>
                  <span>
                    <b>{count.approved ?? 0}</b> approved
                  </span>
                </div>
                {admin && (
                  <AgentSettingsControls
                    agentId={agent.id}
                    autoAssign={setting.autoAssign}
                    dailyLimit={setting.dailyLimit}
                    enabled={setting.enabled}
                    hasRoutine={Boolean(agent.routine)}
                  />
                )}
              </article>
            );
          })}
        </section>

        <section className="review-section">
          <h2>Assign a task</h2>
          <AssignTaskForm
            agents={team.map((agent) => ({ id: agent.id, name: agent.name, role: agent.role, kind: agent.kind, enabled: settings[agent.id].enabled }))}
            initialAgent={agentFilter}
            questions={questions
              .filter((question) => question.answerCount === 0)
              .concat(questions.filter((question) => question.answerCount > 0))
              .slice(0, 60)
              .map((question) => ({ value: question.id, label: `${question.answerCount === 0 ? "(unanswered) " : ""}${question.title}`.slice(0, 120) }))}
            reports={reports.map(({ report, target }) => ({
              value: report.id,
              label: `${report.resourceType} · ${reportReasons[report.reason as keyof typeof reportReasons] ?? report.reason} · ${(target?.text ?? "").slice(0, 60)}`,
            }))}
          />
        </section>

        <section className="review-section">
          <h2 className="agent-tasks-heading">
            <span>
              Tasks <span>{tasks.length}</span>
            </span>
            <RunRoutinesButton />
          </h2>
          {!anyAuto && (
            <p className="queue-empty">
              No agent has auto-assign on, so the scheduled worker only runs tasks people assign.
              {admin ? " Turn on auto-assign on a card to let it pick up its routine." : ""}
            </p>
          )}
          <nav className="agent-views" aria-label="Task views">
            {(Object.keys(views) as View[]).map((target) => (
              <Link aria-current={target === view ? "page" : undefined} href={viewHref(target)} key={target}>
                {views[target].label}
              </Link>
            ))}
            {agentFilter && (
              <Link className="agent-filter-clear" href={`/workspace/agents?view=${view}`}>
                {team.find((agent) => agent.id === agentFilter)?.name} ×
              </Link>
            )}
          </nav>
          {tasks.length === 0 ? (
            <p className="queue-empty">Nothing here.</p>
          ) : (
            <ul className="contribution-list agent-task-list">
              {tasks.map((task) => {
                const agent = team.find((candidate) => candidate.id === task.agentId);
                return (
                  <li className={task.status === "review" ? "open" : ""} key={task.id}>
                    <span>
                      <small>
                        {agent?.name ?? task.agentId} · <b className={`task-status ${task.status}`}>{statusLabels[task.status]}</b> ·{" "}
                        {timeAgo(task.createdAt)}
                        {task.createdById ? "" : " · routine"}
                      </small>
                      <Link href={`/workspace/agents/${task.id}`}>
                        <strong>{task.title}</strong>
                      </Link>
                      {task.status === "failed" && task.error && <em>{task.error}</em>}
                    </span>
                    <Link className="review-mini" href={`/workspace/agents/${task.id}`}>
                      {task.status === "review" ? "Review" : "Open"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
