import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "../client";
import { answers, questions, users } from "../schema";
import { readMemberProfile } from "./users";
import type { HelperCandidate } from "@/lib/questions";

export type QuestionRow = typeof questions.$inferSelect;

export type QuestionAuthor = {
  id: string;
  handle: string | null;
  displayName: string | null;
};

export type QuestionListItem = {
  id: string;
  title: string;
  topicSlugs: string[];
  stages: string[];
  facets: string[];
  acceptedAnswerId: string | null;
  answerCount: number;
  createdAt: Date;
  author: QuestionAuthor;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id is a 404, not a Postgres cast error. */
export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export async function createQuestion(params: {
  authorId: string;
  title: string;
  body: string;
  topicSlugs: string[];
  stages: string[];
  facets: string[];
}) {
  const [question] = await getDatabase().insert(questions).values(params).returning();
  return question;
}

export async function listQuestions(): Promise<QuestionListItem[]> {
  const answerCount = sql<number>`(
    select count(*)::int from ${answers}
    where ${answers.questionId} = ${questions.id} and ${answers.status} = 'visible'
  )`;

  const rows = await getDatabase()
    .select({
      question: questions,
      answerCount,
      handle: users.handle,
      displayName: users.displayName,
    })
    .from(questions)
    .innerJoin(users, eq(users.id, questions.authorId))
    .where(eq(questions.status, "visible"))
    .orderBy(desc(questions.createdAt))
    .limit(300);

  return rows.map(({ question, answerCount, handle, displayName }) => ({
    id: question.id,
    title: question.title,
    topicSlugs: question.topicSlugs ?? [],
    stages: question.stages ?? [],
    facets: question.facets ?? [],
    acceptedAnswerId: question.acceptedAnswerId,
    answerCount: Number(answerCount),
    createdAt: question.createdAt,
    author: { id: question.authorId, handle, displayName },
  }));
}

export async function getQuestion(id: string) {
  if (!isUuid(id)) return undefined;
  const [row] = await getDatabase()
    .select({ question: questions, handle: users.handle, displayName: users.displayName })
    .from(questions)
    .innerJoin(users, eq(users.id, questions.authorId))
    .where(and(eq(questions.id, id), eq(questions.status, "visible")))
    .limit(1);
  if (!row) return undefined;
  return {
    ...row.question,
    author: { id: row.question.authorId, handle: row.handle, displayName: row.displayName },
  };
}

export async function listAnswers(questionId: string) {
  const rows = await getDatabase()
    .select({ answer: answers, handle: users.handle, displayName: users.displayName })
    .from(answers)
    .innerJoin(users, eq(users.id, answers.authorId))
    .where(and(eq(answers.questionId, questionId), eq(answers.status, "visible")))
    .orderBy(asc(answers.createdAt));

  return rows.map(({ answer, handle, displayName }) => ({
    id: answer.id,
    body: answer.body,
    createdAt: answer.createdAt,
    author: { id: answer.authorId, handle, displayName } as QuestionAuthor,
  }));
}

export async function createAnswer(params: { questionId: string; authorId: string; body: string }) {
  const database = getDatabase();
  const [answer] = await database.insert(answers).values(params).returning();
  await database
    .update(questions)
    .set({ updatedAt: new Date() })
    .where(eq(questions.id, params.questionId));
  return answer;
}

export async function getAnswer(questionId: string, answerId: string) {
  if (!isUuid(answerId)) return undefined;
  const [answer] = await getDatabase()
    .select()
    .from(answers)
    .where(
      and(
        eq(answers.id, answerId),
        eq(answers.questionId, questionId),
        eq(answers.status, "visible"),
      ),
    )
    .limit(1);
  return answer;
}

export async function setAcceptedAnswer(questionId: string, answerId: string) {
  await getDatabase()
    .update(questions)
    .set({ acceptedAnswerId: answerId, updatedAt: new Date() })
    .where(eq(questions.id, questionId));
}

/** The same double-submit guard as talks: same author, same title, still visible. */
export async function findQuestionByTitle(authorId: string, title: string) {
  const [existing] = await getDatabase()
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(
        eq(questions.authorId, authorId),
        eq(questions.title, title),
        eq(questions.status, "visible"),
      ),
    )
    .limit(1);
  return existing ?? null;
}

export type HelperCandidateWithIdentity = HelperCandidate & {
  handle: string | null;
  displayName: string | null;
};

/**
 * Everyone who could be routed to or suggested: members who said what they
 * can help with, or where in the pipeline they work. Matching happens in
 * application code against the file-based vocabularies (lib/questions.ts).
 */
export async function listHelperCandidates(): Promise<HelperCandidateWithIdentity[]> {
  const rows = await getDatabase()
    .select()
    .from(users)
    .where(
      sql`jsonb_array_length(${users.canHelpWith}) > 0 OR jsonb_array_length(${users.stages}) > 0`,
    );

  return rows.map((user) => ({
    userId: user.id,
    handle: user.handle,
    displayName: user.displayName,
    profile: readMemberProfile(user),
  }));
}
