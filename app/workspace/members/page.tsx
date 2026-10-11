import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarPlus, MailCheck, Users, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canModerate, isAdministrator } from "@/lib/auth/roles";
import {
  listMembersForAdmin,
  memberFilters,
  memberStats,
  recentMemberAudit,
  type MemberFilter,
} from "@/lib/db/repositories/member-admin";
import { professionalRoleLabels } from "@/lib/member-profile";
import { timeAgo } from "@/lib/time";
import { MemberActions } from "@/components/member-actions";
import { WorkspaceNav } from "@/components/workspace-nav";
import { workspaceCounts } from "@/lib/workspace-counts";

export const metadata: Metadata = { title: "Members", robots: { index: false } };
export const dynamic = "force-dynamic";

type MembersPageProps = { searchParams: Promise<{ q?: string; filter?: string; page?: string }> };

const filterLabels: Record<MemberFilter, string> = {
  all: "All accounts",
  staff: "Editors and moderators",
  unconfirmed: "Email not confirmed",
  suspended: "Suspended",
};

const actionLabels: Record<string, string> = {
  role_changed: "changed the role of",
  suspended: "suspended",
  restored: "restored",
  deleted: "deleted",
};

/** Moderators and administrators: every account, and what can be done to it. */
export default async function MembersAdminPage({ searchParams }: MembersPageProps) {
  const viewer = await getCurrentUser();
  if (!viewer || !canModerate(viewer)) notFound();
  const admin = isAdministrator(viewer);

  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 100);
  const filter = (memberFilters as readonly string[]).includes(params.filter ?? "") ? (params.filter as MemberFilter) : "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [{ rows, total, pageSize }, stats, audit] = await Promise.all([
    listMembersForAdmin({ q, filter, page }),
    memberStats(),
    recentMemberAudit(15),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (target: number) => {
    const search = new URLSearchParams({ ...(q ? { q } : {}), ...(filter !== "all" ? { filter } : {}), page: String(target) });
    return `/workspace/members?${search}`;
  };

  return (
    <div className="workspace-page">
      <section className="workspace-top">
        <div className="shell workspace-title">
          <div>
            <span className="eyebrow">
              <Users size={15} />
              Administration
            </span>
            <h1>Members</h1>
            <p>
              Every account on AVRMD. {admin ? "You can change roles, suspend and delete accounts." : "As a moderator you can suspend and restore accounts."}{" "}
              Suspending signs the person out everywhere and hides their profile; their posts stay until you hide them.
            </p>
          </div>
        </div>
      </section>

      <div className="shell review-body">
        <WorkspaceNav counts={await workspaceCounts()} current="members" showMembers />
        <div className="metric-grid metric-grid-5">
          <div>
            <Users size={19} />
            <strong>{stats.total}</strong>
            <span>Accounts</span>
          </div>
          <div>
            <MailCheck size={19} />
            <strong>{stats.confirmed}</strong>
            <span>Email confirmed</span>
          </div>
          <div>
            <CalendarPlus size={19} />
            <strong>{stats.newThisWeek}</strong>
            <span>New this week</span>
          </div>
          <div>
            <Activity size={19} />
            <strong>{stats.activeThisWeek}</strong>
            <span>Active this week</span>
          </div>
          <div>
            <Ban size={19} />
            <strong>{stats.suspended}</strong>
            <span>Suspended</span>
          </div>
        </div>

        <form action="/workspace/members" className="member-search" method="GET">
          <input aria-label="Search by email, name or handle" defaultValue={q} name="q" placeholder="Search by email, name or handle" type="search" />
          <select aria-label="Show" defaultValue={filter} name="filter">
            {memberFilters.map((value) => (
              <option key={value} value={value}>
                {filterLabels[value]}
              </option>
            ))}
          </select>
          <button className="button-primary" type="submit">
            Search
          </button>
        </form>

        <section className="review-section">
          <h2>
            {filterLabels[filter]} <span>{total}</span>
          </h2>
          {rows.length === 0 ? (
            <p className="queue-empty">No accounts match.</p>
          ) : (
            <ul className="contribution-list member-list">
              {rows.map((member) => {
                const self = member.id === viewer.id;
                const declared = (member.roles ?? []).map((role) => professionalRoleLabels[role as keyof typeof professionalRoleLabels] ?? role);
                const status = member.suspendedAt
                  ? `suspended ${timeAgo(member.suspendedAt)}`
                  : member.emailVerifiedAt
                    ? "confirmed"
                    : "email not confirmed";
                return (
                  <li className={member.suspendedAt ? "open" : ""} key={member.id}>
                    <span>
                      <small>
                        {member.role !== "member" && <b className="member-role-badge">{member.role}</b>} {status} · joined {timeAgo(member.createdAt)}
                        {member.lastSeenAt ? ` · seen ${timeAgo(member.lastSeenAt)}` : ""}
                        {member.googleSub ? " · Google" : ""}
                        {member.passwordHash ? " · password" : ""}
                      </small>
                      <strong>
                        <Link href={`/workspace/members/${member.id}`}>{member.displayName || `@${member.handle ?? "—"}`}</Link>{" "}
                        <em>{member.email}</em>
                      </strong>
                      {declared.length > 0 && <em>{declared.join(" · ")}</em>}
                    </span>
                    {self ? (
                      <small className="member-note">This is you</small>
                    ) : (
                      <MemberActions
                        canChangeRole={admin}
                        canSuspend={admin || member.role !== "administrator"}
                        email={member.email}
                        id={member.id}
                        role={member.role}
                        suspended={Boolean(member.suspendedAt)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {pages > 1 && (
            <nav aria-label="Pages" className="member-pages">
              {page > 1 && <Link href={pageHref(page - 1)}>← Newer</Link>}
              <span>
                Page {page} of {pages}
              </span>
              {page < pages && <Link href={pageHref(page + 1)}>Older →</Link>}
            </nav>
          )}
        </section>

        <section className="review-section">
          <h2>Recent actions</h2>
          {audit.length === 0 ? (
            <p className="queue-empty">Nothing yet. Role changes, suspensions and deletions are recorded here.</p>
          ) : (
            <ul className="dismissed-list">
              {audit.map(({ event, actorEmail }) => (
                <li key={event.id}>
                  <span>
                    <small>{timeAgo(event.createdAt)}</small>
                    <span>
                      {actorEmail ?? "A former account"} {actionLabels[event.action] ?? event.action}{" "}
                      <strong>{String(event.details.email ?? "an account")}</strong>
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
