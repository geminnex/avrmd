import type { Metadata } from "next";
import Link from "next/link";
import { Building2, LifeBuoy, Users } from "lucide-react";
import { getEntity } from "@/lib/catalog";
import {
  matchesDirectoryQuery,
  professionalRoleHints,
  professionalRoleLabels,
  professionalRoles,
  profileMatchScore,
  type ProfessionalRole,
} from "@/lib/member-profile";
import { listDirectoryMembers } from "@/lib/db/repositories/users";
import { stageLabels, stages } from "@/lib/stages";
import { topics } from "@/lib/topics";
import type { PipelineStage } from "@/lib/catalog-types";
import { toggleParam } from "@/lib/url";

export const metadata: Metadata = {
  title: "Members",
  description:
    "Find someone working on the same problem — by role, by pipeline stage, and by what they can help with.",
};

export const dynamic = "force-dynamic";

type MembersPageProps = {
  searchParams: Promise<{ role?: string; stage?: string; help?: string; topic?: string }>;
};


export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const query = {
    role: params.role,
    stage: params.stage,
    helpWith: params.help,
    topic: params.topic,
  };

  let members: Awaited<ReturnType<typeof listDirectoryMembers>> = [];
  let databaseDown = false;
  try {
    members = await listDirectoryMembers();
  } catch {
    databaseDown = true;
  }

  const results = members
    .filter((member) => matchesDirectoryQuery(member.profile, query))
    .sort((a, b) => {
      const byScore = profileMatchScore(b.profile, query) - profileMatchScore(a.profile, query);
      if (byScore !== 0) return byScore;
      // Then whoever offered the most help, so a filled-in profile is worth
      // filling in.
      return b.profile.canHelpWith.length - a.profile.canHelpWith.length;
    });

  // Only offer an expertise filter for things somebody has actually claimed —
  // a list of 59 facets where 55 return nothing is worse than no list.
  const offeredHelp = new Map<string, number>();
  for (const member of members) {
    for (const item of member.profile.canHelpWith) {
      offeredHelp.set(item, (offeredHelp.get(item) ?? 0) + 1);
    }
  }
  const helpOptions = [...offeredHelp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  const linkParams = {
    role: params.role,
    stage: params.stage,
    help: params.help,
    topic: params.topic,
  };

  return (
    <div className="members-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">
            <Users size={15} />
            Members
          </span>
          <h1>Find someone who has been here before.</h1>
          <p>
            Reading gets you the facts. Getting unstuck usually takes a person. Members
            say what they work on and what they can help with — this is how you find them.
          </p>
        </div>
      </section>

      <div className="shell members-body">
        <div className="talk-filters">
          <div className="talk-filter-group">
            <span className="talk-filter-label">Role</span>
            <Link className={`chip${!params.role ? " chip-active" : ""}`} href={toggleParam("/members", linkParams, "role")}>
              Any
            </Link>
            {professionalRoles.map((role) => (
              <Link
                className={`chip${params.role === role ? " chip-active" : ""}`}
                href={toggleParam("/members", linkParams, "role", role)}
                key={role}
                title={professionalRoleHints[role]}
              >
                {professionalRoleLabels[role]}
              </Link>
            ))}
          </div>

          <div className="talk-filter-group">
            <span className="talk-filter-label">Stage</span>
            <Link className={`chip${!params.stage ? " chip-active" : ""}`} href={toggleParam("/members", linkParams, "stage")}>
              Any
            </Link>
            {stages.map((stage) => (
              <Link
                className={`chip${params.stage === stage.slug ? " chip-active" : ""}`}
                href={toggleParam("/members", linkParams, "stage", stage.slug)}
                key={stage.slug}
              >
                {stage.name}
              </Link>
            ))}
          </div>

          {helpOptions.length > 0 && (
            <div className="talk-filter-group">
              <span className="talk-filter-label">Can help with</span>
              {helpOptions.map(([name, count]) => (
                <Link
                  className={`chip${params.help === name ? " chip-active" : ""}`}
                  href={toggleParam("/members", linkParams, "help", name)}
                  key={name}
                >
                  {name} ({count})
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="result-line">
          <span>
            <strong>{results.length}</strong> {results.length === 1 ? "member" : "members"}
          </span>
        </div>

        {databaseDown ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>The directory is unavailable right now</h3>
            <p>Everything else on the site still works. Try again shortly.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>{members.length === 0 ? "Nobody has filled in a profile yet" : "No member matches that"}</h3>
            <p>
              {members.length === 0
                ? "This directory is only as useful as what people say about themselves. Be the first."
                : "Try a broader filter — or be the person somebody was looking for."}
            </p>
            <Link className="button-primary" href="/settings/profile">
              Fill in your profile
            </Link>
          </div>
        ) : (
          <div className="member-grid">
            {results.map((member) => {
              const affiliation = member.profile.affiliationSlug
                ? getEntity(member.profile.affiliationSlug)
                : undefined;
              return (
                <Link
                  className="member-card"
                  href={`/members/${member.handle}`}
                  key={member.id}
                >
                  <span className="member-card-head">
                    <span className="member-avatar small" aria-hidden="true">
                      {(member.displayName || member.handle || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{member.displayName || `@${member.handle}`}</strong>
                      <small>@{member.handle}</small>
                    </span>
                  </span>

                  <span className="member-card-roles">
                    {member.profile.roles.map((role) => (
                      <span className="chip" key={role}>
                        {professionalRoleLabels[role as ProfessionalRole] ?? role}
                      </span>
                    ))}
                  </span>

                  {affiliation && (
                    <small className="member-card-affiliation">
                      <Building2 size={13} />
                      {affiliation.name}
                    </small>
                  )}

                  {member.bio && <p className="member-card-bio">{member.bio}</p>}

                  {member.profile.stages.length > 0 && (
                    <small className="member-card-stages">
                      {member.profile.stages
                        .map((stage) => stageLabels[stage as PipelineStage] ?? stage)
                        .join(" · ")}
                    </small>
                  )}

                  {member.profile.canHelpWith.length > 0 && (
                    <span className="member-card-help">
                      <LifeBuoy size={13} />
                      <span>Can help with {member.profile.canHelpWith.slice(0, 3).join(", ")}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <div className="secondary-browse">
          <div>
            <strong>Want to be findable here?</strong>
            <span>Say what you work on and what you can help with.</span>
          </div>
          <Link className="primary-link" href="/settings/profile">
            Edit your profile
          </Link>
        </div>

        <div className="members-topic-row">
          <span>Browse by clinical area:</span>
          {topics.map((topic) => (
            <Link
              className={`chip${params.topic === topic.slug ? " chip-active" : ""}`}
              href={toggleParam("/members", linkParams, "topic", topic.slug)}
              key={topic.slug}
            >
              {topic.shortName}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
