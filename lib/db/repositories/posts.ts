import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../client";
import { postComments, postLikes, postMedia, posts, users } from "../schema";

export type PostKind = "update" | "blog";

export async function createPost(params: {
  authorId: string;
  body: string;
  entitySlug?: string;
  kind?: PostKind;
  mediaUrls?: { url: string; mimeType: string }[];
}) {
  const database = getDatabase();

  const [post] = await database
    .insert(posts)
    .values({
      authorId: params.authorId,
      body: params.body,
      entitySlug: params.entitySlug ?? null,
      kind: params.kind ?? "update",
    })
    .returning();

  if (params.mediaUrls?.length) {
    await database
      .insert(postMedia)
      .values(params.mediaUrls.map((media) => ({ postId: post.id, ...media })));
  }

  return post;
}

type PostRow = { post: typeof posts.$inferSelect; authorHandle: string | null; authorDisplayName: string | null };

/** Shared by every listing that needs media + like/comment counts, so each stays a fixed handful of queries rather than N+1. */
async function enrichPosts(rows: PostRow[]) {
  if (rows.length === 0) return [];
  const database = getDatabase();

  const postIds = rows.map((row) => row.post.id);
  const media = await database.select().from(postMedia).where(inArray(postMedia.postId, postIds));
  const likeCounts = await database
    .select({ postId: postLikes.postId, count: sql<number>`count(*)::int` })
    .from(postLikes)
    .where(inArray(postLikes.postId, postIds))
    .groupBy(postLikes.postId);
  const commentCounts = await database
    .select({ postId: postComments.postId, count: sql<number>`count(*)::int` })
    .from(postComments)
    .where(inArray(postComments.postId, postIds))
    .groupBy(postComments.postId);

  const mediaByPost = groupBy(media, (item) => item.postId);
  const likesByPost = new Map(likeCounts.map((item) => [item.postId, item.count]));
  const commentsByPost = new Map(commentCounts.map((item) => [item.postId, item.count]));

  return rows.map((row) => ({
    ...row.post,
    authorHandle: row.authorHandle,
    authorDisplayName: row.authorDisplayName,
    media: mediaByPost.get(row.post.id) ?? [],
    likeCount: likesByPost.get(row.post.id) ?? 0,
    commentCount: commentsByPost.get(row.post.id) ?? 0,
  }));
}

export async function listRecentPosts(limit = 25) {
  const rows = await getDatabase()
    .select({
      post: posts,
      authorHandle: users.handle,
      authorDisplayName: users.displayName,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return enrichPosts(rows);
}

export async function getPost(id: string) {
  const database = getDatabase();
  const [row] = await database
    .select({ post: posts, authorHandle: users.handle, authorDisplayName: users.displayName })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, id))
    .limit(1);

  if (!row) return undefined;

  const media = await database.select().from(postMedia).where(eq(postMedia.postId, id));
  return { ...row.post, authorHandle: row.authorHandle, authorDisplayName: row.authorDisplayName, media };
}

export async function listPostsByEntity(entitySlug: string, kind?: PostKind) {
  const conditions = kind
    ? and(eq(posts.entitySlug, entitySlug), eq(posts.kind, kind))
    : eq(posts.entitySlug, entitySlug);

  const rows = await getDatabase()
    .select({ post: posts, authorHandle: users.handle, authorDisplayName: users.displayName })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(conditions)
    .orderBy(desc(posts.createdAt));

  return enrichPosts(rows);
}

/** Flattened media across every post on an entity, newest first. */
export async function listMediaForEntity(entitySlug: string) {
  const entityPosts = await listPostsByEntity(entitySlug);
  return entityPosts.flatMap((post) =>
    post.media.map((item) => ({ ...item, postId: post.id, createdAt: post.createdAt })),
  );
}

export async function likePost(postId: string, userId: string) {
  await getDatabase().insert(postLikes).values({ postId, userId }).onConflictDoNothing();
}

export async function unlikePost(postId: string, userId: string) {
  await getDatabase()
    .delete(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
}

export async function countLikes(postId: string) {
  const [row] = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));
  return row?.count ?? 0;
}

export async function hasLiked(postId: string, userId: string) {
  const [row] = await getDatabase()
    .select({ id: postLikes.id })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function addComment(postId: string, authorId: string, body: string) {
  const [comment] = await getDatabase()
    .insert(postComments)
    .values({ postId, authorId, body })
    .returning();
  return comment;
}

export async function listComments(postId: string) {
  return getDatabase()
    .select({ comment: postComments, authorHandle: users.handle, authorDisplayName: users.displayName })
    .from(postComments)
    .innerJoin(users, eq(postComments.authorId, users.id))
    .where(eq(postComments.postId, postId))
    .orderBy(postComments.createdAt);
}

function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const group = key(item);
    map.set(group, [...(map.get(group) ?? []), item]);
  }
  return map;
}
