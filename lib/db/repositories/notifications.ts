import { and, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "../client";
import { notifications, questions, users } from "../schema";

export type NotificationKind = (typeof notifications.$inferInsert)["kind"];

export async function createNotifications(
  rows: {
    userId: string;
    kind: NotificationKind;
    actorId: string;
    questionId: string;
    answerId?: string | null;
    matched?: string[];
  }[],
) {
  if (rows.length === 0) return;
  await getDatabase()
    .insert(notifications)
    .values(
      rows.map((row) => ({
        userId: row.userId,
        kind: row.kind,
        actorId: row.actorId,
        questionId: row.questionId,
        answerId: row.answerId ?? null,
        reason: row.matched ? { matched: row.matched } : {},
      })),
    )
    .onConflictDoNothing();
}

/** Members who have already been routed `limit` questions since `since`. */
export async function findRoutingSaturated(userIds: string[], since: Date, limit: number) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await getDatabase()
    .select({ userId: notifications.userId, total: count() })
    .from(notifications)
    .where(
      and(
        inArray(notifications.userId, userIds),
        eq(notifications.kind, "question_routed"),
        gte(notifications.createdAt, since),
      ),
    )
    .groupBy(notifications.userId);
  return new Set(rows.filter((row) => row.total >= limit).map((row) => row.userId));
}

export async function countUnreadNotifications(userId: string) {
  const [row] = await getDatabase()
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.total ?? 0;
}

const actors = alias(users, "actors");

export async function listNotifications(userId: string, limit = 50) {
  const rows = await getDatabase()
    .select({
      notification: notifications,
      questionTitle: questions.title,
      actorHandle: actors.handle,
      actorDisplayName: actors.displayName,
    })
    .from(notifications)
    .innerJoin(questions, eq(questions.id, notifications.questionId))
    .leftJoin(actors, eq(actors.id, notifications.actorId))
    .where(and(eq(notifications.userId, userId), eq(questions.status, "visible")))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map(({ notification, questionTitle, actorHandle, actorDisplayName }) => ({
    id: notification.id,
    kind: notification.kind,
    questionId: notification.questionId,
    answerId: notification.answerId,
    matched: notification.reason?.matched ?? [],
    read: Boolean(notification.readAt),
    createdAt: notification.createdAt,
    questionTitle,
    actor: actorHandle ? { handle: actorHandle, displayName: actorDisplayName } : null,
  }));
}

export async function markAllNotificationsRead(userId: string) {
  await getDatabase()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
