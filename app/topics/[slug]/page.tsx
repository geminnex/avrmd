import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MessagesSquare, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { EntityCard } from "@/components/entity-card";
import { ThreadCard } from "@/components/thread-card";
import { kindLabels } from "@/lib/catalog";
import { getThreadsForTopic } from "@/lib/community";
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
  const threads = getThreadsForTopic(topic.slug);
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

        {threads.length > 0 && (
          <section className="topic-section" id="discussions">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <MessagesSquare size={15} />
                  Discussion
                </span>
                <h2>Questions professionals are asking</h2>
              </div>
            </div>
            {threads.map((thread) => (
              <ThreadCard key={thread.slug} thread={thread} />
            ))}
            <div className="topic-discussion-cta">
              <span>
                These threads are illustrative examples. Accounts are not open yet.
              </span>
              <Link className="primary-link" href="/community">
                All community topics
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )}

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
