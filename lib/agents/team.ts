/**
 * The AI operations team. Each agent has one job, drafts only, and has its
 * work reviewed by a person in /workspace/agents before anything changes.
 */
export const taskKinds = ["draft_answer", "assess_report", "draft_invitation", "site_report", "research_brief", "weekly_article"] as const;
export type TaskKind = (typeof taskKinds)[number];

export type AgentDefinition = {
  id: string;
  name: string;
  role: string;
  description: string;
  kind: TaskKind;
  /** What approving one of its tasks does. */
  onApprove: string;
  /** What the scheduled worker assigns it when auto-assign is on. */
  routine?: string;
  /** Auto-assign starts on for this agent until an administrator changes it. */
  autoByDefault?: boolean;
};

export const team: AgentDefinition[] = [
  {
    id: "mira",
    name: "Mira",
    role: "Editor",
    description: "Writes the Sunday article: the week's new FDA authorizations, papers, trials, industry news and community questions, with the trends behind them and links to the pages on AVRMD.",
    kind: "weekly_article",
    onApprove: "Publishes the (edited) article on /weekly and the home page.",
    routine: "One article every Sunday.",
    autoByDefault: true,
  },
  {
    id: "iris",
    name: "Iris",
    role: "Community host",
    description: "Drafts an answer to a member question from AVRMD's library, with links to the sources it used.",
    kind: "draft_answer",
    onApprove: "Posts the (edited) answer under your name.",
    routine: "Questions with no answer after 24 hours.",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: "Moderator",
    description: "Reads a reported question, answer or post and recommends hiding it or dismissing the report, with a reason.",
    kind: "assess_report",
    onApprove: "Applies the decision you choose: hide the content or dismiss the report.",
    routine: "Every open report.",
  },
  {
    id: "echo",
    name: "Echo",
    role: "Outreach",
    description: "Writes the personal note for an invitation to an expert, from their name and field.",
    kind: "draft_invitation",
    onApprove: "Sends the invitation from you, with the (edited) note.",
  },
  {
    id: "atlas",
    name: "Atlas",
    role: "Analyst",
    description: "Writes a weekly report on the site: members, questions, reports, the assistant and the review queue, with suggestions.",
    kind: "site_report",
    onApprove: "Files the report as read.",
    routine: "One report a week.",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Researcher",
    description: "Writes a short briefing on a topic from AVRMD's records, FDA list, papers and talks, citing each source.",
    kind: "research_brief",
    onApprove: "Files the briefing.",
  },
];

export function getAgent(id: string) {
  return team.find((agent) => agent.id === id);
}

export const statusLabels: Record<string, string> = {
  queued: "Queued",
  running: "Working",
  review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
  cancelled: "Cancelled",
};
