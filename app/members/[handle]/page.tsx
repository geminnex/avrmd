import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MessagesSquare } from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { getUserByHandle } from "@/lib/db/repositories/users";
import { countFollowers } from "@/lib/db/repositories/follows";
import { getCurrentUser } from "@/lib/auth/session";

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
  const user = await getUserByHandle(handle);
  if (!user) return {};
  return { title: user.displayName || `@${user.handle}` };
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { handle } = await params;
  const [user, viewer] = await Promise.all([getUserByHandle(handle), getCurrentUser()]);
  if (!user) notFound();

  const followerCount = await countFollowers("user", user.id);
  const isOwnProfile = viewer?.id === user.id;

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
            {user.bio && <p>{user.bio}</p>}
            <div className="member-meta">
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
