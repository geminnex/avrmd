import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2, LifeBuoy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getQuestion,
  listAnswers,
  listHelperCandidates,
} from "@/lib/db/repositories/questions";
import { suggestHelpers } from "@/lib/questions";
import { stageLabels } from "@/lib/stages";
import { timeAgo } from "@/lib/time";
import { AcceptAnswerButton } from "@/components/accept-answer-button";
import { AnswerForm } from "@/components/answer-form";
import { QuestionTags } from "@/components/question-tags";
import type { PipelineStage } from "@/lib/catalog-types";

export const dynamic = "force-dynamic";

type QuestionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asked?: string }>;
};

async function loadQuestion(id: string) {
  try {
    return await getQuestion(id);
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: QuestionPageProps): Promise<Metadata> {
  const { id } = await params;
  const question = await loadQuestion(id);
  return question ? { title: question.title } : {};
}

function nameOf(person: { displayName: string | null; handle: string | null }) {
  return person.displayName || (person.handle ? `@${person.handle}` : "A member");
}

function PersonLink({ person }: { person: { displayName: string | null; handle: string | null } }) {
  return person.handle ? (
    <Link href={`/members/${person.handle}`}>{nameOf(person)}</Link>
  ) : (
    <span>{nameOf(person)}</span>
  );
}

export default async function QuestionPage({ params, searchParams }: QuestionPageProps) {
  const { id } = await params;
  const { asked } = await searchParams;
  const question = await loadQuestion(id);
  if (!question) notFound();

  const [answers, viewer, candidates] = await Promise.all([
    listAnswers(question.id),
    getCurrentUser(),
    listHelperCandidates().catch(() => []),
  ]);

  const isAsker = viewer?.id === question.authorId;
  const routedCount = isAsker && asked !== undefined ? Number(asked) : null;

  // Accepted answer first, the rest in the order they arrived.
  const ordered = [...answers].sort(
    (a, b) =>
      Number(b.id === question.acceptedAnswerId) - Number(a.id === question.acceptedAnswerId),
  );

  const helpers = suggestHelpers(question, candidates, {
    excludeIds: [question.authorId, ...answers.map((answer) => answer.author.id)],
    limit: 5,
  });
  const helperIdentity = new Map(candidates.map((candidate) => [candidate.userId, candidate]));

  return (
    <div className="question-page">
      <div className="shell question-layout">
        <div className="question-main">
          <Link className="back-link" href="/questions">
            <ArrowLeft size={15} />
            All questions
          </Link>

          {routedCount !== null && Number.isFinite(routedCount) && (
            <div className="question-routed-note" role="status">
              <BellRing size={17} />
              <span>
                {routedCount > 0 ? (
                  <>
                    Posted, and sent to{" "}
                    <strong>
                      {routedCount} {routedCount === 1 ? "member" : "members"}
                    </strong>{" "}
                    who said they can help with these tags. You will be notified when
                    someone answers.
                  </>
                ) : (
                  <>
                    Posted. Nobody has said they can help with these tags yet, so it is
                    listed under Questions for anyone browsing. You will be notified when
                    someone answers.
                  </>
                )}
              </span>
            </div>
          )}

          <article className="question-card">
            <h1>{question.title}</h1>
            <small className="question-row-meta">
              Asked by <PersonLink person={question.author} /> · {timeAgo(question.createdAt)}
            </small>
            {question.body && <p className="question-body">{question.body}</p>}
            <QuestionTags tags={question} />
          </article>

          <h2 className="answers-heading">
            {answers.length === 0
              ? "No answers yet"
              : `${answers.length} ${answers.length === 1 ? "answer" : "answers"}`}
          </h2>

          {ordered.map((answer) => {
            const accepted = answer.id === question.acceptedAnswerId;
            return (
              <article
                className={`answer-card${accepted ? " accepted" : ""}`}
                id={`answer-${answer.id}`}
                key={answer.id}
              >
                {accepted && (
                  <span className="answer-accepted-label">
                    <CheckCircle2 size={15} />
                    Helped the person who asked
                  </span>
                )}
                <p className="question-body">{answer.body}</p>
                <footer>
                  <small className="question-row-meta">
                    <PersonLink person={answer.author} /> · {timeAgo(answer.createdAt)}
                  </small>
                  {isAsker && !accepted && (
                    <AcceptAnswerButton answerId={answer.id} questionId={question.id} />
                  )}
                </footer>
              </article>
            );
          })}

          {viewer ? (
            <AnswerForm questionId={question.id} />
          ) : (
            <div className="secondary-browse">
              <div>
                <strong>Know the answer?</strong>
                <span>Sign in to answer. Answers are posted under your profile.</span>
              </div>
              <Link className="primary-link" href={`/sign-in?next=/questions/${question.id}`}>
                Sign in to answer
              </Link>
            </div>
          )}
        </div>

        <aside className="question-aside">
          <div className="sidebar-card">
            <span className="eyebrow">
              <LifeBuoy size={14} />
              People who may know
            </span>
            {helpers.length === 0 ? (
              <p className="question-aside-empty">
                Nobody has said they can help with these tags yet.{" "}
                <Link href="/settings/profile">Can you?</Link>
              </p>
            ) : (
              <ul className="helper-list">
                {helpers.map((match) => {
                  const person = helperIdentity.get(match.userId);
                  if (!person?.handle) return null;
                  return (
                    <li key={match.userId}>
                      <Link href={`/members/${person.handle}`}>
                        <strong>{nameOf(person)}</strong>
                        <small>
                          {match.helpMatches.length > 0
                            ? `Can help with ${match.helpMatches.join(", ")}`
                            : `Works on ${match.stageMatches
                                .map((stage) => stageLabels[stage as PipelineStage] ?? stage)
                                .join(", ")}`}
                        </small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
