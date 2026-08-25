import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { talks, users } from "../schema";

export type MemberTalkRow = {
  slug: string;
  title: string;
  speakers: string[];
  url: string;
  hostLabel: string;
  topicSlugs: string[];
  stages: string[];
  facets: string[];
  submittedByHandle: string | null;
};

export async function listMemberTalks(): Promise<MemberTalkRow[]> {
  const database = getDatabase();
  const rows = await database
    .select({ talk: talks, handle: users.handle })
    .from(talks)
    .leftJoin(users, eq(users.id, talks.submittedBy))
    .where(eq(talks.status, "visible"))
    .orderBy(desc(talks.createdAt));

  return rows.map(({ talk, handle }) => ({
    slug: talk.slug,
    title: talk.title,
    speakers: talk.speakers ?? [],
    url: talk.url,
    hostLabel: talk.hostLabel,
    topicSlugs: talk.topicSlugs ?? [],
    stages: talk.stages ?? [],
    facets: talk.facets ?? [],
    submittedByHandle: handle,
  }));
}

export async function createMemberTalk(params: {
  submittedBy: string;
  slug: string;
  title: string;
  speakers: string[];
  url: string;
  hostLabel: string;
  topicSlugs: string[];
  stages: string[];
  facets: string[];
}) {
  const database = getDatabase();
  const [talk] = await database.insert(talks).values(params).returning();
  return talk;
}

/** Same submitter, same URL — the common double-submit, worth refusing by name. */
export async function findMemberTalkByUrl(submittedBy: string, url: string) {
  const database = getDatabase();
  const [existing] = await database
    .select({ slug: talks.slug })
    .from(talks)
    .where(and(eq(talks.submittedBy, submittedBy), eq(talks.url, url)))
    .limit(1);
  return existing ?? null;
}

export async function memberTalkSlugExists(slug: string) {
  const database = getDatabase();
  const [existing] = await database
    .select({ slug: talks.slug })
    .from(talks)
    .where(eq(talks.slug, slug))
    .limit(1);
  return Boolean(existing);
}
