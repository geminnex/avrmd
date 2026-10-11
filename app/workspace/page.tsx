import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Bot, Clock3, FileCheck2, Flag, Inbox, Radar, Send, ShieldCheck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canModerate, isStaff } from "@/lib/auth/roles";
import { WorkspaceNav, type WorkspaceTab } from "@/components/workspace-nav";
import { workspaceCounts } from "@/lib/workspace-counts";
import { modalities, specialties, useCases } from "@/lib/catalog";
import { entityKinds } from "@/lib/catalog-types";
import { readDataFile } from "@/lib/data-file";
import { initialFields } from "@/lib/review";
import { readQueue } from "@/lib/review-store";
import { stages } from "@/lib/stages";
import { timeAgo } from "@/lib/time";
import { ContributionActions, InviteForm, ReportActions, RestoreButton, ReviewCard } from "@/components/review-card";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type Contribution = Awaited<ReturnType<typeof import("@/lib/db/repositories/contributions").listContributions>>[number];

async function loadReports() {
  try {
    const { listOpenReports, reportReasons } = await import("@/lib/db/repositories/reports");
    return { reports: await listOpenReports(), reasons: reportReasons as Record<string, string> };
  } catch {
    return { reports: [], reasons: {} as Record<string, string> };
  }
}

async function loadInvitations() {
  try {
    const { listInvitations } = await import("@/lib/db/repositories/invitations");
    return await listInvitations();
  } catch {
    return [];
  }
}

async function loadContributions(): Promise<Contribution[]> {
  try {
    const { listContributions } = await import("@/lib/db/repositories/contributions");
    return await listContributions();
  } catch {
    return [];
  }
}

function describeContribution(payload: Record<string, unknown>) {
  const name = payload.name ?? payload.entityName ?? payload.organizationName ?? payload.entitySlug ?? "";
  const detail = payload.sourceUrl ?? payload.relationship ?? payload.campaignGoal ?? payload.message ?? "";
  return { name: String(name), detail: String(detail) };
}

const tabs = ["overview", "queue", "reports", "contributions", "invite"] as const;
type Tab = (typeof tabs)[number];

const intros: Record<Tab, { title: string; text: string }> = {
  overview: { title: "Admin", text: "What is waiting for you across the site. Each tab holds one job." },
  queue: {
    title: "Review queue",
    text: "The daily robot finds papers, trials, filings and news; AI sets aside the routine and off-topic ones and drafts a record for the rest. You decide what enters the catalog. Approved records publish with the next deploy.",
  },
  reports: { title: "Reports", text: "Content members reported. Hide it, or dismiss the report if nothing is wrong." },
  contributions: { title: "Contributions", text: "Record suggestions, claims and promotion enquiries people sent in." },
  invite: {
    title: "Invitations",
    text: "A personal invitation from you. Replies go to your inbox; the link creates a confirmed account in one step and works for 30 days.",
  },
};

type WorkspacePageProps = { searchParams: Promise<{ tab?: string }> };

/** Editors only: the admin tools, one tab per job. */
export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const requested = (await searchParams).tab ?? "overview";
  const tab: Tab = (tabs as readonly string[]).includes(requested) ? (requested as Tab) : "overview";

  const counts = await workspaceCounts();
  const showMembers = canModerate(user);
  const intro = intros[tab];

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <span className="eyebrow">
              <Radar size={15} />
              Admin
            </span>
            <h1>{intro.title}</h1>
            <p>{intro.text}</p>
          </div>
        </div>
      </section>

      <div className="shell review-body">
        <WorkspaceNav counts={counts} current={tab as WorkspaceTab} showMembers={showMembers} />
        {tab === "overview" && <Overview counts={counts} showMembers={showMembers} />}
        {tab === "queue" && <QueueTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "contributions" && <ContributionsTab />}
        {tab === "invite" && <InviteTab />}
      </div>
    </div>
  );
}

async function Overview({ counts, showMembers }: { counts: Awaited<ReturnType<typeof workspaceCounts>>; showMembers: boolean }) {
  const log = readDataFile<{ lastRunAt?: string }>("discovery-log.json", {});
  const approved = readQueue().filter((item) => item.status === "approved").length;
  let members: { total: number; newThisWeek: number } | null = null;
  if (showMembers) {
    try {
      const { memberStats } = await import("@/lib/db/repositories/member-admin");
      members = await memberStats();
    } catch {
      members = null;
    }
  }
  const cards = [
    { href: "/workspace?tab=reports", icon: <Flag size={19} />, value: counts.reports, label: "Open reports" },
    { href: "/workspace?tab=queue", icon: <ShieldCheck size={19} />, value: counts.queue, label: "To review" },
    { href: "/workspace?tab=contributions", icon: <Inbox size={19} />, value: counts.contributions, label: "Contributions open" },
    { href: "/workspace?tab=invite", icon: <Send size={19} />, value: counts.invitations, label: "Invitations pending" },
    ...(members
      ? [{ href: "/workspace/members", icon: <Users size={19} />, value: members.total, label: `Accounts · ${members.newThisWeek} new this week` }]
      : []),
    { href: "/workspace?tab=queue", icon: <FileCheck2 size={19} />, value: approved, label: "Approved records" },
    { href: "/workspace?tab=queue", icon: <Clock3 size={19} />, value: log.lastRunAt ? timeAgo(log.lastRunAt) : "—", label: "Last robot run" },
  ];
  return (
    <div className="metric-grid workspace-overview">
      {cards.map((card) => (
        <Link href={card.href} key={card.label}>
          {card.icon}
          <strong>{card.value}</strong>
          <span>{card.label}</span>
        </Link>
      ))}
    </div>
  );
}

async function ReportsTab() {
  const { reports, reasons } = await loadReports();
  return (
    <section className="review-section" id="reports">
      <h2>
        Open reports <span>{reports.length}</span>
      </h2>
      {reports.length === 0 ? (
        <p className="queue-empty">No open reports.</p>
      ) : (
        <ul className="contribution-list">
          {reports.map(({ report, target }) => (
            <li className="open" key={report.id}>
              <span>
                <small>
                  {report.resourceType} · {reasons[report.reason] ?? report.reason} · {timeAgo(report.createdAt)}
                </small>
                {target ? (
                  <a href={target.href} rel="noopener" target="_blank">
                    <strong>{target.text.slice(0, 160)}</strong>
                  </a>
                ) : (
                  <strong>(already removed)</strong>
                )}
                {report.details && <em>&ldquo;{report.details}&rdquo;</em>}
              </span>
              <ReportActions id={report.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function InviteTab() {
  const invites = await loadInvitations();
  return (
    <section className="review-section" id="invite">
      <h2>
        Invite people <span>{invites.filter((row) => row.joined).length} joined of {invites.length}</span>
      </h2>
      <InviteForm />
      {invites.length > 0 && (
        <ul className="contribution-list">
          {invites.map(({ invitation, inviterName, joined }) => (
            <li className={joined ? "" : "open"} key={invitation.id}>
              <span>
                <small>
                  {inviterName ?? "Former editor"} · {timeAgo(invitation.createdAt)} ·{" "}
                  {joined ? "joined" : invitation.expiresAt.getTime() < Date.now() ? "expired" : "not yet joined"}
                </small>
                <strong>{invitation.name ? `${invitation.name} <${invitation.email}>` : invitation.email}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function ContributionsTab() {
  const contributions = await loadContributions();
  return (
    <section className="review-section">
      <h2>
        Contributions <span>{contributions.length}</span>
      </h2>
      {contributions.length === 0 ? (
        <p className="queue-empty">Nothing sent in yet.</p>
      ) : (
        <ul className="contribution-list">
          {contributions.map(({ contribution, email }) => {
            const { name, detail } = describeContribution(contribution.payload);
            return (
              <li className={contribution.status === "submitted" ? "open" : ""} key={contribution.id}>
                <span>
                  <small>
                    {contribution.kind} · {email} · {timeAgo(contribution.createdAt)} · {contribution.status}
                  </small>
                  <strong>{name}</strong>
                  {detail && <em>{detail.slice(0, 200)}</em>}
                </span>
                <ContributionActions id={contribution.id} status={contribution.status} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function QueueTab() {
  const queue = readQueue();
  const recommended = queue
    .filter((item) => item.status === "pending")
    .sort((a, b) => (b.triage?.confidence ?? -1) - (a.triage?.confidence ?? -1));
  const dismissed = queue
    .filter((item) => item.status === "dismissed")
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const vocab = {
    kinds: [...entityKinds],
    specialties: specialties.map((value) => ({ value, label: value })),
    useCases: useCases.map((value) => ({ value, label: value })),
    modalities: modalities.map((value) => ({ value, label: value })),
    stages: stages.map((stage) => ({ value: stage.slug, label: stage.name })),
  };
  return (
    <>
      <section className="review-section">
        <h2>
          Recommended for the catalog <span>{recommended.length}</span>
        </h2>
        {recommended.length === 0 ? (
          <p className="queue-empty">Nothing waiting. The robot runs daily.</p>
        ) : (
          recommended.slice(0, 25).map((item) => (
            <ReviewCard
              confidence={item.triage?.confidence}
              id={item.id}
              initial={initialFields(item)}
              key={item.id}
              published={item.published}
              reason={item.triage?.reason}
              sourceLabel={item.sourceLabel}
              sourceUrl={item.sourceUrl}
              title={item.title}
              vocab={vocab}
            />
          ))
        )}
        {recommended.length > 25 && <p className="queue-empty">Showing the 25 highest-confidence; decide these to see more.</p>}
      </section>

      <section className="review-section">
        <h2>
          <Bot size={18} /> Set aside by AI <span>{dismissed.length}</span>
        </h2>
        <p className="queue-empty">
          Routine or off-topic items stay in the papers &amp; news feed (or out of it, if off
          topic). Restore any that deserve a record.
        </p>
        <ul className="dismissed-list">
          {dismissed.slice(0, 40).map((item) => (
            <li key={item.id}>
              <span>
                <a href={item.sourceUrl} rel="noopener" target="_blank">
                  {item.title}
                </a>
                <small>
                  {item.triage?.recommendation === "off_topic" ? "Off topic" : "Signal only"} · {item.triage?.reason}
                </small>
              </span>
              <RestoreButton id={item.id} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
