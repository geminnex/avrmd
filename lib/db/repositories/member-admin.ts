import { and, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, ne, or, type SQL } from "drizzle-orm";
import { getDatabase } from "../client";
import { answers, auditEvents, contributions, invitations, postComments, posts, questions, sessions, talks, users } from "../schema";
import type { AssignableRole } from "@/lib/auth/roles";

export const memberFilters = ["all", "staff", "unconfirmed", "suspended"] as const;
export type MemberFilter = (typeof memberFilters)[number];

const pageSize = 50;

function where(q: string, filter: MemberFilter): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  const term = q.trim().replace(/[%_\\]/g, (char) => `\\${char}`);
  if (term) {
    parts.push(or(ilike(users.email, `%${term}%`), ilike(users.displayName, `%${term}%`), ilike(users.handle, `%${term}%`)));
  }
  if (filter === "staff") parts.push(inArray(users.role, ["editor", "moderator", "administrator"]));
  if (filter === "unconfirmed") parts.push(isNull(users.emailVerifiedAt));
  if (filter === "suspended") parts.push(isNotNull(users.suspendedAt));
  return parts.length ? and(...parts) : undefined;
}

/** One page of accounts, newest first, for the administration screen. */
export async function listMembersForAdmin({ q = "", filter = "all" as MemberFilter, page = 1 }) {
  const condition = where(q, filter);
  const database = getDatabase();
  const [rows, [{ total }]] = await Promise.all([
    database
      .select()
      .from(users)
      .where(condition)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    database.select({ total: count() }).from(users).where(condition),
  ]);
  return { rows, total, pageSize };
}

export async function memberStats() {
  const database = getDatabase();
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const one = async (condition?: SQL) => (await database.select({ n: count() }).from(users).where(condition))[0].n;
  const [total, confirmed, newThisWeek, activeThisWeek, suspended] = await Promise.all([
    one(),
    one(isNotNull(users.emailVerifiedAt)),
    one(gte(users.createdAt, week)),
    one(gte(users.lastSeenAt, week)),
    one(isNotNull(users.suspendedAt)),
  ]);
  return { total, confirmed, newThisWeek, activeThisWeek, suspended };
}

async function audit(actorId: string, action: string, target: { id: string; email: string }, details: Record<string, unknown> = {}) {
  await getDatabase()
    .insert(auditEvents)
    .values({ actorId, action, resourceType: "user", resourceId: target.id, details: { email: target.email, ...details } });
}

async function target(id: string) {
  const [row] = await getDatabase().select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function setMemberRole(actorId: string, id: string, role: AssignableRole) {
  const member = await target(id);
  if (!member) return undefined;
  if (member.role === role) return member;
  const [updated] = await getDatabase()
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  await audit(actorId, "role_changed", member, { from: member.role, to: role });
  return updated;
}

/** Suspending ends every session at once; sign-in is refused until restored. */
export async function setMemberSuspended(actorId: string, id: string, suspended: boolean) {
  const member = await target(id);
  if (!member) return undefined;
  const [updated] = await getDatabase()
    .update(users)
    .set({ suspendedAt: suspended ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (suspended) await getDatabase().delete(sessions).where(eq(sessions.userId, id));
  await audit(actorId, suspended ? "suspended" : "restored", member);
  return updated;
}

/** Deletes the account and everything that cascades from it; the audit row keeps the address. */
export async function deleteMemberAccount(actorId: string, id: string) {
  const member = await target(id);
  if (!member) return false;
  await getDatabase().delete(users).where(eq(users.id, id));
  await audit(actorId, "deleted", member, { role: member.role });
  return true;
}

export async function countAdministrators(exceptId?: string) {
  const condition = exceptId ? and(eq(users.role, "administrator"), ne(users.id, exceptId)) : eq(users.role, "administrator");
  return (await getDatabase().select({ n: count() }).from(users).where(condition))[0].n;
}

export async function recentMemberAudit(limit = 20) {
  const rows = await getDatabase()
    .select({ event: auditEvents, actorEmail: users.email })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .where(eq(auditEvents.resourceType, "user"))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows;
}

/** Everything an administrator needs to judge one account. */
export async function memberDetail(id: string) {
  const database = getDatabase();
  const [member] = await database.select().from(users).where(eq(users.id, id)).limit(1);
  if (!member) return undefined;
  const [
    questionCount,
    answerCount,
    postCount,
    commentCount,
    [{ talkCount }],
    [{ contributionCount }],
    [{ sessionCount }],
    recentQuestions,
    recentAnswers,
    history,
    [invitation],
  ] = await Promise.all([
    database.select({ n: count() }).from(questions).where(eq(questions.authorId, id)).then(([row]) => row.n),
    database.select({ n: count() }).from(answers).where(eq(answers.authorId, id)).then(([row]) => row.n),
    database.select({ n: count() }).from(posts).where(eq(posts.authorId, id)).then(([row]) => row.n),
    database.select({ n: count() }).from(postComments).where(eq(postComments.authorId, id)).then(([row]) => row.n),
    database.select({ talkCount: count() }).from(talks).where(eq(talks.submittedBy, id)),
    database.select({ contributionCount: count() }).from(contributions).where(eq(contributions.userId, id)),
    database.select({ sessionCount: count() }).from(sessions).where(and(eq(sessions.userId, id), gte(sessions.expiresAt, new Date()))),
    database
      .select({ id: questions.id, title: questions.title, status: questions.status, createdAt: questions.createdAt })
      .from(questions)
      .where(eq(questions.authorId, id))
      .orderBy(desc(questions.createdAt))
      .limit(5),
    database
      .select({ questionId: answers.questionId, body: answers.body, status: answers.status, createdAt: answers.createdAt, questionTitle: questions.title })
      .from(answers)
      .innerJoin(questions, eq(questions.id, answers.questionId))
      .where(eq(answers.authorId, id))
      .orderBy(desc(answers.createdAt))
      .limit(5),
    database
      .select({ event: auditEvents, actorEmail: users.email })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorId))
      .where(and(eq(auditEvents.resourceType, "user"), eq(auditEvents.resourceId, id)))
      .orderBy(desc(auditEvents.createdAt))
      .limit(20),
    database
      .select({ createdAt: invitations.createdAt, inviterEmail: users.email })
      .from(invitations)
      .leftJoin(users, eq(users.id, invitations.invitedById))
      .where(eq(invitations.email, member.email))
      .orderBy(desc(invitations.createdAt))
      .limit(1),
  ]);
  return {
    member,
    counts: {
      questions: questionCount,
      answers: answerCount,
      posts: postCount,
      comments: commentCount,
      talks: talkCount,
      contributions: contributionCount,
      sessions: sessionCount,
    },
    recentQuestions,
    recentAnswers,
    history,
    invitation,
  };
}
