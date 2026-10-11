import { readQueue } from "./review-store";

/** The numbers on the admin tabs: what is waiting in each. */
export async function workspaceCounts() {
  const queue = readQueue();
  const counts = { queue: queue.filter((item) => item.status === "pending").length, reports: 0, contributions: 0, invitations: 0, agents: 0 };
  try {
    const [{ listOpenReports }, { listContributions }, { listInvitations }, { listAgentTasks }] = await Promise.all([
      import("./db/repositories/reports"),
      import("./db/repositories/contributions"),
      import("./db/repositories/invitations"),
      import("./db/repositories/agent-tasks"),
    ]);
    const [reports, contributions, invitations, review] = await Promise.all([
      listOpenReports(),
      listContributions(),
      listInvitations(),
      listAgentTasks({ status: ["review"], limit: 200 }),
    ]);
    counts.agents = review.length;
    counts.reports = reports.length;
    counts.contributions = contributions.filter((row) => row.contribution.status === "submitted").length;
    counts.invitations = invitations.filter((row) => !row.joined && row.invitation.expiresAt.getTime() > Date.now()).length;
  } catch {
    // The tabs still render without the database; the numbers just stay at zero.
  }
  return counts;
}

export type WorkspaceCounts = Awaited<ReturnType<typeof workspaceCounts>>;
