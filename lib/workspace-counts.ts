import { readQueue } from "./review-store";

/** The numbers on the admin tabs: what is waiting in each. */
export async function workspaceCounts() {
  const queue = readQueue();
  const counts = { queue: queue.filter((item) => item.status === "pending").length, reports: 0, contributions: 0, invitations: 0 };
  try {
    const [{ listOpenReports }, { listContributions }, { listInvitations }] = await Promise.all([
      import("./db/repositories/reports"),
      import("./db/repositories/contributions"),
      import("./db/repositories/invitations"),
    ]);
    const [reports, contributions, invitations] = await Promise.all([listOpenReports(), listContributions(), listInvitations()]);
    counts.reports = reports.length;
    counts.contributions = contributions.filter((row) => row.contribution.status === "submitted").length;
    counts.invitations = invitations.filter((row) => !row.joined && row.invitation.expiresAt.getTime() > Date.now()).length;
  } catch {
    // The tabs still render without the database; the numbers just stay at zero.
  }
  return counts;
}

export type WorkspaceCounts = Awaited<ReturnType<typeof workspaceCounts>>;
