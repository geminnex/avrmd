import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "../client";
import { follows } from "../schema";

export type FollowingType = "user" | "entity";

export async function isFollowing(
  followerId: string,
  followingType: FollowingType,
  followingId: string,
) {
  const [row] = await getDatabase()
    .select({ id: follows.id })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingType, followingType),
        eq(follows.followingId, followingId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Idempotent — following twice is a no-op, not an error. */
export async function follow(
  followerId: string,
  followingType: FollowingType,
  followingId: string,
) {
  await getDatabase()
    .insert(follows)
    .values({ followerId, followingType, followingId })
    .onConflictDoNothing();
}

export async function unfollow(
  followerId: string,
  followingType: FollowingType,
  followingId: string,
) {
  await getDatabase()
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingType, followingType),
        eq(follows.followingId, followingId),
      ),
    );
}

export async function countFollowers(followingType: FollowingType, followingId: string) {
  const [row] = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(and(eq(follows.followingType, followingType), eq(follows.followingId, followingId)));
  return row?.count ?? 0;
}

export async function listFollowing(followerId: string, followingType: FollowingType) {
  return getDatabase()
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingType, followingType)));
}
