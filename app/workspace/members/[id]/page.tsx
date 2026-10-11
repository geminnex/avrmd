import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canModerate, isAdministrator } from "@/lib/auth/roles";
import { isUuid } from "@/lib/ids";
import { memberDetail } from "@/lib/db/repositories/member-admin";
import { readMemberProfile } from "@/lib/db/repositories/users";
import { professionalRoleLabels } from "@/lib/member-profile";
import { stageLabels } from "@/lib/stages";
import { topics } from "@/lib/topics";
import { timeAgo } from "@/lib/time";
import { MemberActions } from "@/components/member-actions";
import { WorkspaceNav } from "@/components/workspace-nav";
import { workspaceCounts } from "@/lib/workspace-counts";

export const metadata: Metadata = { title: "Member", robots: { index: false } };
export const dynamic = "force-dynamic";

const actionLabels: Record<string, string> = {
  role_changed: "changed the role",
  suspended: "suspended the account",
  restored: "restored the account",
  deleted: "deleted the account",
};

const date = (value: Date | null | undefined) =>
  value ? `${value.toISOString().slice(0, 10)} (${timeAgo(value)})` : "—";

/** One account, as an administrator or moderator sees it. */
export default async function MemberAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer || !canModerate(viewer)) notFound();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const detail = await memberDetail(id);
  if (!detail) notFound();

  const { member, counts, recentQuestions, recentAnswers, history, invitation } = detail;
  const profile = readMemberProfile(member);
  const admin = isAdministrator(viewer);
  const self = member.id === viewer.id;
  const name = member.displayName || (member.handle ? `@${member.handle}` : member.email);
  const status = member.suspendedAt ? "Suspended" : member.emailVerifiedAt ? "Active" : "Email not confirmed";

  const facts: [string, React.ReactNode][] = [
    ["Email", member.email],
    ["Handle", member.handle ? `@${member.handle}` : "—"],
    ["Site role", member.role],
    ["Status", status],
    ["Sign-in methods", [member.passwordHash && "password", member.googleSub && "Google"].filter(Boolean).join(", ") || "none yet"],
    ["Joined", date(member.createdAt)],
    ["Email confirmed", date(member.emailVerifiedAt)],
    ["Last seen", date(member.lastSeenAt)],
    ["Signed in on", `${counts.sessions} device${counts.sessions === 1 ? "" : "s"}`],
    ["Invited", invitation ? `by ${invitation.inviterEmail ?? "a former editor"}, ${timeAgo(invitation.createdAt)}` : "no"],
    ["Emails", Object.entries(member.emailPrefs ?? {}).filter(([, on]) => on).map(([kind]) => kind).join(", ") || "all off"],
  ];
  if (member.suspendedAt) facts.splice(4, 0, ["Suspended", date(member.suspendedAt)]);

  const declared: [string, string[]][] = [
    ["Professional roles", profile.roles.map((role) => professionalRoleLabels[role] ?? role)],
    ["Stages", profile.stages.map((stage) => stageLabels[stage] ?? stage)],
    ["Can help with", profile.canHelpWith],
    ["Looking for", profile.lookingFor],
    ["Topics", profile.topicInterests.map((slug) => topics.find((topic) => topic.slug === slug)?.name ?? slug)],
    ["Affiliation", profile.affiliationSlug ? [profile.affiliationSlug] : []],
  ];

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <Link className="member-back" href="/workspace/members">
              <ArrowLeft size={14} /> All members
            </Link>
            <span className="eyebrow">
              <UserRound size={15} />
              Member
            </span>
            <h1>{name}</h1>
            {member.bio && <p>{member.bio}</p>}
          </div>
        </div>
      </section>

      <div className="shell review-body">
        <WorkspaceNav counts={await workspaceCounts()} current="members" showMembers />

        <section className="review-section member-detail-actions">
          {self ? (
            <p className="queue-empty">This is your account. Change your own details in <Link href="/settings/profile">settings</Link>.</p>
          ) : (
            <MemberActions
              canChangeRole={admin}
              canSuspend={admin || member.role !== "administrator"}
              email={member.email}
              id={member.id}
              redirectAfterDelete="/workspace/members"
              role={member.role}
              suspended={Boolean(member.suspendedAt)}
            />
          )}
          {member.handle && !member.suspendedAt && (
            <Link className="review-mini" href={`/members/${member.handle}`}>
              Public profile <ArrowUpRight size={13} />
            </Link>
          )}
        </section>

        <div className="member-detail-grid">
          <section className="review-section">
            <h2>Account</h2>
            <dl className="member-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="review-section">
            <h2>Profile</h2>
            <dl className="member-facts">
              {declared.map(([label, values]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{values.length ? values.join(" · ") : "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section className="review-section">
          <h2>Activity</h2>
          <div className="metric-grid metric-grid-6">
            {(
              [
                ["Questions", counts.questions],
                ["Answers", counts.answers],
                ["Posts", counts.posts],
                ["Comments", counts.comments],
                ["Talks", counts.talks],
                ["Contributions", counts.contributions],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {recentQuestions.length > 0 && (
            <>
              <h3 className="member-sub">Latest questions</h3>
              <ul className="dismissed-list">
                {recentQuestions.map((question) => (
                  <li key={question.id}>
                    <span>
                      <Link href={`/questions/${question.id}`}>{question.title}</Link>
                      <small>
                        {timeAgo(question.createdAt)}
                        {question.status !== "visible" ? ` · ${question.status}` : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {recentAnswers.length > 0 && (
            <>
              <h3 className="member-sub">Latest answers</h3>
              <ul className="dismissed-list">
                {recentAnswers.map((answer) => (
                  <li key={`${answer.questionId}-${answer.createdAt.toISOString()}`}>
                    <span>
                      <Link href={`/questions/${answer.questionId}`}>{answer.questionTitle}</Link>
                      <small>
                        {timeAgo(answer.createdAt)}
                        {answer.status !== "visible" ? ` · ${answer.status}` : ""} · {answer.body.slice(0, 140)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="review-section">
          <h2>History</h2>
          {history.length === 0 ? (
            <p className="queue-empty">No administrative actions on this account.</p>
          ) : (
            <ul className="dismissed-list">
              {history.map(({ event, actorEmail }) => (
                <li key={event.id}>
                  <span>
                    <small>{date(event.createdAt)}</small>
                    <span>
                      {actorEmail ?? "A former account"} {actionLabels[event.action] ?? event.action}
                      {event.action === "role_changed" ? ` (${String(event.details.from)} → ${String(event.details.to)})` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
