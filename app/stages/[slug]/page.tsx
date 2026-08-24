import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Route, Wrench } from "lucide-react";
import { EntityCard } from "@/components/entity-card";
import { kindLabels } from "@/lib/catalog";
import {
  getStage,
  getStageEntitiesByKind,
  getTechnicalProblems,
  stages,
} from "@/lib/stages";

type StagePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return stages.map((stage) => ({ slug: stage.slug }));
}

export async function generateMetadata({ params }: StagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const stage = getStage(slug);
  if (!stage) return {};
  return { title: stage.name, description: stage.question };
}

export default async function StagePage({ params }: StagePageProps) {
  const { slug } = await params;
  const stage = getStage(slug);
  if (!stage) notFound();

  const index = stages.findIndex((item) => item.slug === stage.slug);
  const previous = stages[index - 1];
  const next = stages[index + 1];

  const technical = getTechnicalProblems(stage.slug);
  const technicalSlugs = new Set(technical.map((item) => item.slug));
  // Technical problems lead the page, so keep them out of the grouped list.
  const groups = getStageEntitiesByKind(stage.slug)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !technicalSlugs.has(item.slug)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="stage-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <Link className="back-link" href="/stages">
            <ArrowLeft size={16} />
            All stages
          </Link>
          <span className="eyebrow light">
            <Route size={15} />
            Stage {index + 1} of {stages.length}
          </span>
          <h1>{stage.name}</h1>
          <p className="stage-question">{stage.question}</p>
          <p>{stage.description}</p>
        </div>
      </section>

      <div className="shell stage-body">
        {technical.length > 0 && (
          <section className="stage-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <Wrench size={15} />
                  Open technical problems
                </span>
                <h2>What is still hard here</h2>
              </div>
              <p>
                Unsolved engineering problems at this stage, each linked to work
                documenting the difficulty.
              </p>
            </div>
            <div className="entity-grid">
              {technical.map((entity) => (
                <EntityCard entity={entity} key={entity.id} />
              ))}
            </div>
          </section>
        )}

        {groups.map((group) => (
          <section className="stage-section" key={group.kind}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">{kindLabels[group.kind]}</span>
                <h2>
                  {group.items.length} {group.items.length === 1 ? "record" : "records"} at
                  this stage
                </h2>
              </div>
            </div>
            <div className="entity-grid">
              {group.items.map((entity) => (
                <EntityCard entity={entity} key={entity.id} />
              ))}
            </div>
          </section>
        ))}

        <nav className="stage-nav" aria-label="Adjacent stages">
          {previous ? (
            <Link href={`/stages/${previous.slug}`}>
              <ArrowLeft size={15} />
              {previous.name}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/stages/${next.slug}`}>
              {next.name}
              <ArrowRight size={15} />
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
