import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { EntityCard } from "@/components/entity-card";
import { kindLabels } from "@/lib/catalog";
import { getTopic, getTopicEntitiesByKind, topics } from "@/lib/topics";

type TopicPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return {};

  return {
    title: topic.name,
    description: topic.tagline,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const groups = getTopicEntitiesByKind(topic);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="topic-page">
      <section className={`page-intro topic-hero accent-${topic.accent}`}>
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <Link className="back-link" href="/topics">
            <ArrowLeft size={16} />
            All clinical topics
          </Link>
          <span className="eyebrow light">Clinical topic</span>
          <h1>{topic.name}</h1>
          <p>{topic.intro}</p>
          <div className="topic-hero-facets">
            <span>{total} records</span>
            {topic.specialties.map((specialty) => (
              <Link
                href={`/explore?specialty=${encodeURIComponent(specialty)}`}
                key={specialty}
              >
                {specialty}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="shell topic-body">
        {groups.map((group) => (
          <section className="topic-section" key={group.kind}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">{kindLabels[group.kind]}</span>
                <h2>
                  {group.items.length}{" "}
                  {group.items.length === 1
                    ? kindLabels[group.kind].replace(/s$/, "").toLowerCase()
                    : kindLabels[group.kind].toLowerCase()}{" "}
                  in this topic
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

        <section className="topic-section" id="discussions">
          <div className="secondary-browse">
            <div>
              <strong>Working on {topic.shortName.toLowerCase()}?</strong>
              <span>Ask the members who said they can help, or read what others asked.</span>
            </div>
            <span className="stage-ask-links">
              <Link className="primary-link" href={`/questions?topic=${topic.slug}`}>
                See questions
              </Link>
              <Link className="button-primary" href={`/ask?topic=${topic.slug}`}>
                <MessageCircleQuestion size={16} />
                Ask
              </Link>
            </span>
          </div>
        </section>

        <AdSlot context={{ topicSlug: topic.slug }} slot="topic-aside" />

        <p className="topic-trust-line">
          <ShieldCheck size={16} />
          Every record above shows its source and review state.{" "}
          <Link href="/about#reviews">How AVRMD reviews records</Link>
        </p>
      </div>
    </div>
  );
}
