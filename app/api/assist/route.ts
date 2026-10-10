import { NextResponse } from "next/server";
import { entityHref, getEntity } from "@/lib/catalog";
import { answer, interpret } from "@/lib/assistant/engine";
import { buildActions } from "@/lib/assistant/actions";
import { buildMessages, callModel, promptVersion, rewriteForSearch } from "@/lib/assistant/llm";
import {
  buildCorpus,
  detectFacets,
  detectStages,
  retrieve,
  type CorpusItem,
  type QuestionDoc,
} from "@/lib/assistant/retrieve";
import { rateLimiter } from "@/lib/rate-limit";
import { getStage, getTechnicalProblems } from "@/lib/stages";
import { getAllTalks } from "@/lib/talks";
import { topics } from "@/lib/topics";

const rateLimited = rateLimiter("assist:rateLimited", 20, 60_000);

/**
 * Model answers per visitor per day. Under the site-wide cap below, so one
 * visitor can't spend everyone's budget; past it they still get sources.
 */
const perVisitorModel = rateLimiter("assist-model", 40, 24 * 60 * 60_000);

/** Model calls per rolling 24 hours, site-wide. Past it, answers are retrieval-only. */
const dailyModelLimit = Number(process.env.ASSISTANT_DAILY_LIMIT ?? 400);

async function loadQuestions(): Promise<QuestionDoc[]> {
  try {
    const { listQuestions } = await import("@/lib/db/repositories/questions");
    return (await listQuestions()).map((question) => ({
      id: question.id,
      title: question.title,
      facets: question.facets,
      answerCount: question.answerCount,
    }));
  } catch {
    return [];
  }
}

/** How many members offered help with these facets — a count, never who. */
async function countHelpers(facets: string[]) {
  if (facets.length === 0) return 0;
  try {
    const { listHelperCandidates } = await import("@/lib/db/repositories/questions");
    const candidates = await listHelperCandidates();
    return candidates.filter((candidate) =>
      candidate.profile.canHelpWith.some((item) => facets.includes(item)),
    ).length;
  } catch {
    return 0;
  }
}

async function underDailyLimit() {
  try {
    const { countAssistantRunsSince } = await import("@/lib/db/repositories/ai-usage");
    return (await countAssistantRunsSince(new Date(Date.now() - 86_400_000))) < dailyModelLimit;
  } catch {
    // Without the ledger there is no way to enforce the budget, so don't spend.
    return false;
  }
}

async function logRun(
  call: { model: string; inputTokens?: number; outputTokens?: number; latencyMs: number; error?: string },
  citations: number,
) {
  try {
    const { recordAssistantRun } = await import("@/lib/db/repositories/ai-usage");
    await recordAssistantRun({ ...call, promptVersion, citations });
  } catch {
    // The answer still goes out; the gap shows as a lower count.
  }
}

/** The page the reader is on becomes the first source, so "this" means something. */
function pageContext(
  path: unknown,
  corpus: Omit<CorpusItem, "id">[],
): { pinned?: Omit<CorpusItem, "id">[]; label?: string; stage?: string; topic?: string } {
  if (typeof path !== "string" || !path.startsWith("/")) return {};
  const [, section, slug] = path.split("?")[0].split("/");
  if (section === "entities" || section === "problems") {
    const entity = slug ? getEntity(slug) : undefined;
    const item = entity && corpus.find((doc) => doc.href === entityHref(entity));
    return item ? { pinned: [item], label: `the record page for ${entity.name}` } : {};
  }
  if (section === "stages" && slug) {
    const stage = getStage(slug);
    const item = corpus.find((doc) => doc.href === `/stages/${slug}`);
    if (!item || !stage) return {};
    // A stage page's real content is its open problems; pin those too.
    const problems = getTechnicalProblems(stage.slug)
      .slice(0, 3)
      .map((entity) => corpus.find((doc) => doc.href === entityHref(entity)))
      .filter((doc): doc is Omit<CorpusItem, "id"> => Boolean(doc));
    return { pinned: [item, ...problems], label: `the ${stage.name} stage guide`, stage: stage.slug as string };
  }
  if (section === "topics" && slug) {
    const topic = topics.find((doc) => doc.slug === slug);
    const item = corpus.find((doc) => doc.href === `/topics/${slug}`);
    return item && topic ? { pinned: [item], label: `the ${topic.name} topic hub`, topic: topic.slug } : {};
  }
  if (section === "clearances") return { label: "the list of FDA-authorized AR/VR devices" };
  return {};
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (await rateLimited(ip)) {
    return NextResponse.json({ ok: false, message: "Too many questions. Wait a minute." }, { status: 429 });
  }

  let body: { q?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  if (typeof body.q !== "string" || body.q.trim().length === 0) {
    return NextResponse.json({ ok: false, message: "Ask a question." }, { status: 422 });
  }
  const query = body.q.trim().slice(0, 400);

  const [talks, questions] = await Promise.all([getAllTalks(), loadQuestions()]);
  const corpus = buildCorpus({ talks, questions });
  const context = pageContext(body.path, corpus);
  const modelAvailable =
    Boolean(process.env.OPENROUTER_API_KEY) && (await underDailyLimit()) && !(await perVisitorModel(ip));

  let searchText = query;
  let items = retrieve(searchText, corpus, { pinned: context.pinned });
  const found = items.length - (context.pinned?.length ?? 0);
  if (modelAvailable && (found < 3 || /[^\x00-\x7F]/.test(query))) {
    const rewrite = await rewriteForSearch(query);
    await logRun(rewrite.call, 0);
    if (rewrite.text) {
      searchText = `${query} ${rewrite.text}`;
      items = retrieve(searchText, corpus, { pinned: context.pinned });
    }
  }

  const interpretation = interpret(searchText);
  const facets = detectFacets(searchText);
  const stages = [...new Set([...(context.stage ? [context.stage] : []), ...detectStages(searchText)])];
  const actions = buildActions({
    facets,
    stages,
    topicSlugs: [...new Set([...(context.topic ? [context.topic] : []), ...interpretation.topicSlugs])],
    helperCount: await countHelpers(facets),
    items,
    query,
  });

  const sources = items.map(({ id, type, title, href, external, meta }) => ({
    id,
    type,
    title,
    href,
    external,
    meta,
  }));

  if (modelAvailable) {
    const call = await callModel(buildMessages(query, items, actions, context.label), items, actions);
    await logRun(call, call.reply?.citations.length ?? 0);

    if (call.reply) {
      const chosen = call.reply.actions
        .map((id) => actions.find((action) => action.id === id))
        .filter((action): action is NonNullable<typeof action> => Boolean(action));
      return NextResponse.json({
        ok: true,
        mode: "ai",
        answer: call.reply.answer,
        sources: sources.filter((source) => call.reply!.citations.includes(source.id)),
        actions: chosen.length > 0 ? chosen : actions.slice(0, 2),
        followups: call.reply.followups,
      });
    }
  }

  // Retrieval only: no model, over budget, or the model failed. Still useful —
  // the best-matching sources and the next steps, with the catalog's own lead.
  const basic = answer(interpretation);
  return NextResponse.json({
    ok: true,
    mode: "basic",
    answer: basic.kind === "none" && items.length > 0 ? "Here is what AVRMD has on that." : basic.lead,
    sources: sources.slice(0, 8),
    actions: actions.slice(0, 3),
    followups: [],
  });
}
