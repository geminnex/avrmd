import { desc, eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { communityPosts, communityThreads, users } from "../schema";
import { getUserMembership } from "./memberships";

export async function createThread(entitySlug: string, authorId: string, title: string) {
  const [thread] = await getDatabase()
    .insert(communityThreads)
    .values({ entitySlug, authorId, title, threadType: "question" })
    .returning();
  return thread;
}

export async function listThreadsForEntity(entitySlug: string) {
  return getDatabase()
    .select({ thread: communityThreads, authorHandle: users.handle, authorDisplayName: users.displayName })
    .from(communityThreads)
    .innerJoin(users, eq(communityThreads.authorId, users.id))
    .where(eq(communityThreads.entitySlug, entitySlug))
    .orderBy(desc(communityThreads.updatedAt));
}

/**
 * `isOfficial` is never accepted from a caller — it is derived here, from
 * whether the poster actually holds a membership on the thread's entity, so
 * the "official reply" label can't be forged by posting a claim about it.
 */
export async function addThreadPost(threadId: string, authorId: string, body: string) {
  const database = getDatabase();
  const [thread] = await database
    .select({ entitySlug: communityThreads.entitySlug })
    .from(communityThreads)
    .where(eq(communityThreads.id, threadId))
    .limit(1);

  if (!thread) return undefined;

  const membership = await getUserMembership(authorId, thread.entitySlug);

  const [post] = await database
    .insert(communityPosts)
    .values({ threadId, authorId, body, isOfficial: Boolean(membership) })
    .returning();

  await database
    .update(communityThreads)
    .set({ updatedAt: new Date() })
    .where(eq(communityThreads.id, threadId));

  return post;
}

export async function listThreadPosts(threadId: string) {
  return getDatabase()
    .select({ post: communityPosts, authorHandle: users.handle, authorDisplayName: users.displayName })
    .from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .where(eq(communityPosts.threadId, threadId))
    .orderBy(communityPosts.createdAt);
}

export async function getThread(threadId: string) {
  const [thread] = await getDatabase()
    .select()
    .from(communityThreads)
    .where(eq(communityThreads.id, threadId))
    .limit(1);
  return thread;
}
