import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarDays, Compass, LifeBuoy, MessagesSquare, Search } from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { getUserByHandle, readMemberProfile } from "@/lib/db/repositories/users";
import { countFollowers } from "@/lib/db/repositories/follows";
import { getCurrentUser } from "@/lib/auth/session";
import { entityHref, getEntity } from "@/lib/catalog";
import { getFacetByName } from "@/lib/facets";
import { professionalRoleLabels, type ProfessionalRole } from "@/lib/member-profile";
import { stageLabels } from "@/lib/stages";
import { topics } from "@/lib/topics";
import type { PipelineStage } from "@/lib/catalog-types";

type MemberPageProps = {
  params: Promise<{ handle: string }>;
};

/**
 * Not statically generated: member profiles are real accounts, not catalog
 * records — there is nothing to prerender ahead of a sign-up, and no set of
 * handles known at build time.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { handle } = await params;
  const found = await getUserByHandle(handle);
  const user = found?.suspendedAt ? undefined : found;
  if (!user) return {};
  return { title: user.displayName || `@${user.handle}` };
}

/** Links a declared facet to its page when one exists, so a claim is browsable. */
function FacetLinks({ names }: { names: string[] }) {
  return (
    <span className="member-tag-row">
      {names.map((name) => {
        const facet = getFacetByName(name);
        return facet ? (
          <Link className="chip" href={`/explore?q=${encodeURIComponent(name)}`} key={name}>
            {name}
          </Link>
        ) : (
          <span className="chip" key={name}>
            {name}
          </span>
        );
      })}
    </span>
  );
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { handle } = await params;
  const [user, viewer] = await Promise.all([getUserByHandle(handle), getCurrentUser()]);
  if (!user || user.suspendedAt) notFound();

  const followerCount = await countFollowers("user", user.id);
  const isOwnProfile = viewer?.id === user.id;
  const profile = readMemberProfile(user);
  const affiliation = profile.affiliationSlug ? getEntity(profile.affiliationSlug) : undefined;
  const interests = profile.topicInterests
    .map((slug) => topics.find((topic) => topic.slug === slug))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const hasDeclarations =
    profile.roles.length > 0 ||
    profile.stages.length > 0 ||
    profile.canHelpWith.length > 0 ||
    profile.lookingFor.length > 0 ||
    interests.length > 0;

  return (
    <div className="member-page">
      <section className="member-hero">
        <div className="shell member-hero-inner">
          <span className="member-avatar" aria-hidden="true">
            {(user.displayName || user.handle || user.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="member-hero-copy">
            <h1>{user.displayName || `@${user.handle}`}</h1>
            <span className="member-handle">@{user.handle}</span>
            {profile.roles.length > 0 && (
              <span className="member-role-row">
                {profile.roles.map((role) => (
                  <span className="chip light" key={role}>
                    {professionalRoleLabels[role as ProfessionalRole] ?? role}
                  </span>
                ))}
              </span>
            )}
            {user.bio && <p>{user.bio}</p>}
            <div className="member-meta">
              {affiliation && (
                <Link href={entityHref(affiliation)}>
                  <Building2 size={14} />
                  {affiliation.name}
                </Link>
              )}
              <span>
                <CalendarDays size={14} />
                Joined {user.createdAt.toLocaleDateString("en", { month: "long", year: "numeric" })}
              </span>
              <span>{followerCount} followers</span>
            </div>
          </div>
          {!isOwnProfile && (
            <FollowButton followingId={user.id} followingType="user" label="Follow" />
          )}
        </div>
      </section>

      <div className="shell member-body">
        {hasDeclarations ? (
          <div className="member-declarations">
            {profile.canHelpWith.length > 0 && (
              <div className="member-declaration highlight">
                <span className="eyebrow">
                  <LifeBuoy size={15} />
                  Can help with
                </span>
                <FacetLinks names={profile.canHelpWith} />
              </div>
            )}

            {profile.stages.length > 0 && (
              <div className="member-declaration">
                <span className="eyebrow">
                  <Compass size={15} />
                  Works at these stages
                </span>
                <span className="member-tag-row">
                  {profile.stages.map((stage) => (
                    <Link className="chip" href={`/stages/${stage}`} key={stage}>
                      {stageLabels[stage as PipelineStage] ?? stage}
                    </Link>
                  ))}
                </span>
              </div>
            )}

            {interests.length > 0 && (
              <div className="member-declaration">
                <span className="eyebrow">Clinical interests</span>
                <span className="member-tag-row">
                  {interests.map((topic) => (
                    <Link className="chip" href={`/topics/${topic.slug}`} key={topic.slug}>
                      {topic.shortName}
                    </Link>
                  ))}
                </span>
              </div>
            )}

            {profile.lookingFor.length > 0 && (
              <div className="member-declaration">
                <span className="eyebrow">
                  <Search size={15} />
                  Looking for help with
                </span>
                <FacetLinks names={profile.lookingFor} />
              </div>
            )}
          </div>
        ) : (
          <div className="member-declaration empty">
            <p>
              {isOwnProfile
                ? "You haven't said what you work on yet — that is what puts you in the member directory."
                : "This member hasn't said what they work on yet."}
            </p>
            {isOwnProfile && (
              <Link className="button-primary" href="/settings/profile">
                Fill in your profile
              </Link>
            )}
          </div>
        )}

        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <MessagesSquare size={15} />
              Posts
            </span>
            <h2>Nothing posted yet</h2>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-orbit" />
          <p>Member posts are coming in a follow-up — this profile is ready for them.</p>
        </div>
      </div>
    </div>
  );
}
