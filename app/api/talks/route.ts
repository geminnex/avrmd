import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { pipelineStages } from "@/lib/catalog-types";
import { facets } from "@/lib/facets";
import { topics } from "@/lib/topics";
import { curatedTalks, filterTalks, getAllTalks } from "@/lib/talks";
import {
  createMemberTalk,
  findMemberTalkByUrl,
  memberTalkSlugExists,
} from "@/lib/db/repositories/talks";

const windowMs = 60_000;
const maxPerWindow = 4;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxPerWindow;
}

const topicSlugs = new Set(topics.map((topic) => topic.slug));
const facetNames = new Set(facets.map((facet) => facet.name));

const bodySchema = z.object({
  title: z.string().trim().min(8).max(200),
  url: z.string().trim().url().max(500),
  speakers: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
  hostLabel: z.string().trim().min(2).max(120),
  topicSlugs: z.array(z.string()).max(4).optional(),
  stages: z.array(z.string()).max(4).optional(),
  facets: z.array(z.string()).max(6).optional(),
});

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pool = await getAllTalks();
  const results = filterTalks(pool, {
    topic: url.searchParams.get("topic") ?? undefined,
    stage: url.searchParams.get("stage") ?? undefined,
    facet: url.searchParams.get("facet") ?? undefined,
  });
  return NextResponse.json({ ok: true, talks: results });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to submit a talk." },
      { status: 401 },
    );
  }

  if (rateLimited(user.id)) {
    return NextResponse.json(
      { ok: false, message: "Too many submissions. Wait a minute." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 422 },
    );
  }

  const data = parsed.data;

  if (!/^https:\/\//i.test(data.url)) {
    return NextResponse.json(
      { ok: false, message: "The recording link must start with https://" },
      { status: 422 },
    );
  }

  // Tags must come from the vocabulary the rest of the site browses by —
  // a free-text tag would be unreachable from every filter page.
  const unknownTopic = (data.topicSlugs ?? []).find((slug) => !topicSlugs.has(slug));
  if (unknownTopic) {
    return NextResponse.json(
      { ok: false, message: `Unknown clinical area: ${unknownTopic}` },
      { status: 422 },
    );
  }
  const unknownStage = (data.stages ?? []).find(
    (stage) => !(pipelineStages as readonly string[]).includes(stage),
  );
  if (unknownStage) {
    return NextResponse.json(
      { ok: false, message: `Unknown stage: ${unknownStage}` },
      { status: 422 },
    );
  }
  const unknownFacet = (data.facets ?? []).find((facet) => !facetNames.has(facet));
  if (unknownFacet) {
    return NextResponse.json(
      { ok: false, message: `Unknown tag: ${unknownFacet}` },
      { status: 422 },
    );
  }

  const tagCount =
    (data.topicSlugs?.length ?? 0) + (data.stages?.length ?? 0) + (data.facets?.length ?? 0);
  if (tagCount === 0) {
    return NextResponse.json(
      { ok: false, message: "Add at least one tag so people can find this talk." },
      { status: 422 },
    );
  }

  const duplicate = await findMemberTalkByUrl(user.id, data.url);
  if (duplicate || curatedTalks.some((talk) => talk.url === data.url)) {
    return NextResponse.json(
      { ok: false, message: "That recording is already in the talk track." },
      { status: 409 },
    );
  }

  const base = slugifyTitle(data.title) || "talk";
  const reserved = new Set(curatedTalks.map((talk) => talk.slug));
  let slug = base;
  for (let attempt = 2; reserved.has(slug) || (await memberTalkSlugExists(slug)); attempt += 1) {
    slug = `${base}-${attempt}`;
  }

  const talk = await createMemberTalk({
    submittedBy: user.id,
    slug,
    title: data.title,
    speakers: data.speakers ?? [],
    url: data.url,
    hostLabel: data.hostLabel,
    topicSlugs: data.topicSlugs ?? [],
    stages: data.stages ?? [],
    facets: data.facets ?? [],
  });

  return NextResponse.json({ ok: true, talk });
}
