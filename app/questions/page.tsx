import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MessageCircleQuestion, MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { readMemberProfile } from "@/lib/db/repositories/users";
import { listQuestions } from "@/lib/db/repositories/questions";
import { filterQuestions } from "@/lib/questions";
import { stageLabels, stages } from "@/lib/stages";
import { topics } from "@/lib/topics";
import { timeAgo } from "@/lib/time";
import { QuestionTags } from "@/components/question-tags";
import type { PipelineStage } from "@/lib/catalog-types";

export const metadata: Metadata = {
  title: "Questions",
  description:
    "Questions from people building and using medical XR, answered by members who have done it.",
};

export const dynamic = "force-dynamic";

type QuestionsPageProps = {
  searchParams: Promise<{
    topic?: string;
    stage?: string;
    facet?: string;
    show?: string;
  }>;
};

function queryString(current: Record<string, string | undefined>, key: string, value?: string) {
  const next = { ...current };
  if (!value || next[key] === value) delete next[key];
  else next[key] = value;
  const params = new URLSearchParams(
    Object.entries(next).filter(([, item]) => Boolean(item)) as [string, string][],
  );
  const encoded = params.toString();
  return encoded ? `/questions?${encoded}` : "/questions";
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const viewer = await getCurrentUser();
  const viewerHelp = viewer ? readMemberProfile(viewer).canHelpWith : [];

  let pool: Awaited<ReturnType<typeof listQuestions>> = [];
  let databaseDown = false;
  try {
    pool = await listQuestions();
  } catch {
    databaseDown = true;
  }

  const forMe = params.show === "for-me";
  const results = filterQuestions(pool, {
    topic: params.topic,
    stage: params.stage,
    facet: params.facet,
    unanswered: params.show === "unanswered",
    helpWith: forMe ? viewerHelp : undefined,
  });

  const linkParams = {
    topic: params.topic,
    stage: params.stage,
    facet: params.facet,
    show: params.show,
  };

  const usedStages = new Set(pool.flatMap((question) => question.stages));
  const usedTopics = new Set(pool.flatMap((question) => question.topicSlugs));

  return (
    <div className="talks-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">
            <MessageCircleQuestion size={15} />
            Questions
          </span>
          <h1>The hallway, where people compare notes.</h1>
          <p>
            Questions from people building and using medical XR. Each one goes to the
            members who said they can help with what it is about.
          </p>
        </div>
      </section>

      <div className="shell talks-body">
        <div className="secondary-browse questions-ask-cta">
          <div>
            <strong>Stuck on something?</strong>
            <span>Tag it, and the people who can help are told.</span>
          </div>
          <Link className="button-primary" href="/ask">
            <MessageCircleQuestion size={16} />
            Ask a question
          </Link>
        </div>

        <div className="talk-filters">
          <div className="talk-filter-group">
            <span className="talk-filter-label">Show</span>
            <Link className={`chip${!params.show ? " chip-active" : ""}`} href={queryString(linkParams, "show")}>
              All
            </Link>
            <Link
              className={`chip${params.show === "unanswered" ? " chip-active" : ""}`}
              href={queryString(linkParams, "show", "unanswered")}
            >
              Unanswered
            </Link>
            {viewer && (
              <Link
                className={`chip${forMe ? " chip-active" : ""}`}
                href={queryString(linkParams, "show", "for-me")}
                title="Questions about something you said you can help with"
              >
                Matched to me
              </Link>
            )}
          </div>

          {usedStages.size > 0 && (
            <div className="talk-filter-group">
              <span className="talk-filter-label">Stage</span>
              {stages
                .filter((stage) => usedStages.has(stage.slug))
                .map((stage) => (
                  <Link
                    className={`chip${params.stage === stage.slug ? " chip-active" : ""}`}
                    href={queryString(linkParams, "stage", stage.slug)}
                    key={stage.slug}
                  >
                    {stage.name}
                  </Link>
                ))}
            </div>
          )}

          {usedTopics.size > 0 && (
            <div className="talk-filter-group">
              <span className="talk-filter-label">Clinical area</span>
              {topics
                .filter((topic) => usedTopics.has(topic.slug))
                .map((topic) => (
                  <Link
                    className={`chip${params.topic === topic.slug ? " chip-active" : ""}`}
                    href={queryString(linkParams, "topic", topic.slug)}
                    key={topic.slug}
                  >
                    {topic.shortName}
                  </Link>
                ))}
            </div>
          )}

          {params.facet && (
            <div className="talk-filter-group">
              <span className="talk-filter-label">Tag</span>
              <Link className="chip chip-active" href={queryString(linkParams, "facet")}>
                {params.facet} ×
              </Link>
            </div>
          )}
        </div>

        <div className="result-line">
          <span>
            <strong>{results.length}</strong> {results.length === 1 ? "question" : "questions"}
            {params.stage ? ` at ${stageLabels[params.stage as PipelineStage] ?? params.stage}` : ""}
          </span>
        </div>

        {databaseDown ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>Questions are unavailable right now</h3>
            <p>Everything else on the site still works. Try again shortly.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>
              {pool.length === 0
                ? "No questions yet"
                : forMe && viewerHelp.length === 0
                  ? "Say what you can help with first"
                  : "No question matches that"}
            </h3>
            <p>
              {pool.length === 0
                ? "Be the first to ask. Somebody here has probably solved it already."
                : forMe && viewerHelp.length === 0
                  ? "Questions are matched to you by what your profile says you can help with."
                  : "Try a broader filter."}
            </p>
            {forMe && viewerHelp.length === 0 ? (
              <Link className="button-primary" href="/settings/profile">
                Edit your profile
              </Link>
            ) : (
              <Link className="button-primary" href="/ask">
                Ask a question
              </Link>
            )}
          </div>
        ) : (
          <ol className="question-list">
            {results.map((question) => {
              const author =
                question.author.displayName ||
                (question.author.handle ? `@${question.author.handle}` : "A member");
              return (
                <li className="question-row" key={question.id}>
                  <span
                    className={`question-count${question.acceptedAnswerId ? " answered" : question.answerCount > 0 ? " has-answers" : ""}`}
                    title={question.acceptedAnswerId ? "Has an answer that helped" : undefined}
                  >
                    {question.acceptedAnswerId ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <MessageSquare size={15} />
                    )}
                    <strong>{question.answerCount}</strong>
                    <small>{question.answerCount === 1 ? "answer" : "answers"}</small>
                  </span>
                  <span className="question-row-main">
                    <Link className="question-row-title" href={`/questions/${question.id}`}>
                      {question.title}
                    </Link>
                    <QuestionTags highlight={forMe ? viewerHelp : []} tags={question} />
                    <small className="question-row-meta">
                      {author} · {timeAgo(question.createdAt)}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
