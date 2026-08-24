import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  MessageCircleQuestion,
  Route,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { EntityCard } from "@/components/entity-card";
import { FollowButton } from "@/components/follow-button";
import { catalog, getEntity } from "@/lib/catalog";
import { getStagesForEntity } from "@/lib/stages";
import { getTopic } from "@/lib/topics";
import { getOrganizationsForProblem, getSolutionsForProblem } from "@/lib/relations";

type ProblemPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return catalog
    .filter((entity) => entity.kind === "problem")
    .map((entity) => ({ slug: entity.slug }));
}

export async function generateMetadata({ params }: ProblemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const problem = getEntity(slug);
  if (!problem || problem.kind !== "problem") return {};
  return { title: problem.name, description: problem.summary };
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { slug } = await params;
  const problem = getEntity(slug);
  if (!problem || problem.kind !== "problem") notFound();

  const topic = problem.topicSlug ? getTopic(problem.topicSlug) : undefined;
  const problemStages = getStagesForEntity(problem);
  const solutions = getSolutionsForProblem(problem.slug);
  const organizations = getOrganizationsForProblem(problem.slug);
  // No clinical topic means this is a technical problem: it applies across
  // medicine rather than within one area.
  const isTechnical = !problem.topicSlug;

  return (
    <div className="problem-page">
      <section className={`entity-hero accent-${problem.accent}`}>
        <div className="entity-hero-grid" aria-hidden="true" />
        <div className="shell">
          <Link
            className="back-link"
            href={
              topic
                ? `/topics/${topic.slug}`
                : `/stages/${problemStages[0]?.slug ?? "technology"}`
            }
          >
            <ArrowLeft size={16} />
            {topic ? `Back to ${topic.shortName}` : "Back to stage"}
          </Link>
          <div className="entity-hero-layout">
            <div>
              <span className="kind-label inverted">
                {isTechnical ? "Technical problem" : "Clinical problem"}
              </span>
              <h1>{problem.name}</h1>
              <p>{problem.summary}</p>

              {topic && (
                <div className="entity-topic-row">
                  <span>Clinical area</span>
                  <Link href={`/topics/${topic.slug}`}>{topic.shortName}</Link>
                </div>
              )}
              {problemStages.length > 0 && (
                <div className="entity-stage-row">
                  <span>
                    <Route size={12} /> Stage
                  </span>
                  {problemStages.map((stage) => (
                    <Link href={`/stages/${stage.slug}`} key={stage.slug}>
                      {stage.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <aside className="entity-action-card">
              <span className="entity-mark large" aria-hidden="true">
                {isTechnical ? <Wrench size={22} /> : <MessageCircleQuestion size={22} />}
              </span>
              <strong>Working on this?</strong>
              <p>
                Follow it to see solutions and evidence as they are added to the catalog.
              </p>
              <FollowButton
                followingId={problem.slug}
                followingType="entity"
                label="Follow this problem"
              />
            </aside>
          </div>
        </div>
      </section>

      <div className="shell problem-body">
        <section className="detail-section">
          <span className="eyebrow">Addressed by</span>
          <h2>
            {solutions.length > 0
              ? `${solutions.length} ${solutions.length === 1 ? "record" : "records"} in the catalog`
              : "Nothing in the catalog addresses this yet"}
          </h2>
          {solutions.length > 0 ? (
            <div className="entity-grid problem-grid">
              {solutions.map((entity) => (
                <EntityCard entity={entity} key={entity.id} />
              ))}
            </div>
          ) : (
            <p className="problem-empty">
              This is a real gap rather than a missing page. If you know work that
              addresses it,{" "}
              <Link href="/participate">suggest a record</Link>.
            </p>
          )}
        </section>

        {organizations.length > 0 && (
          <section className="detail-section">
            <span className="eyebrow">
              <Building2 size={15} />
              Who is working on it
            </span>
            <h2>Organisations behind those records</h2>
            <div className="entity-grid problem-grid">
              {organizations.map((entity) => (
                <EntityCard entity={entity} key={entity.id} />
              ))}
            </div>
          </section>
        )}

        <section className="detail-section source-section">
          <span className="eyebrow">Provenance</span>
          <h2>Where this problem statement comes from</h2>
          <a href={problem.sourceUrl} rel="noreferrer" target="_blank">
            <span>
              <ShieldCheck size={19} />
              <span>
                <strong>{problem.sourceLabel}</strong>
                <small>{problem.sourceNote}</small>
              </span>
            </span>
            <ArrowUpRight size={18} />
          </a>
        </section>
      </div>
    </div>
  );
}
