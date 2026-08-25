import type { Metadata } from "next";
import { ArrowUpRight, ExternalLink, Mic } from "lucide-react";
import { filterTalks, getAllTalks, getTalkTagCounts } from "@/lib/talks";
import { stageLabels, stages } from "@/lib/stages";
import { topics } from "@/lib/topics";
import type { PipelineStage } from "@/lib/catalog-types";
import { TalkSubmitForm } from "@/components/talk-submit-form";

export const metadata: Metadata = {
  title: "Talks",
  description:
    "Recorded talks on medical XR — surgery, therapy, regulation, and the technology underneath.",
};

type TalksPageProps = {
  searchParams: Promise<{ topic?: string; stage?: string; facet?: string }>;
};

export default async function TalksPage({ searchParams }: TalksPageProps) {
  const params = await searchParams;
  const pool = await getAllTalks();
  const results = filterTalks(pool, {
    topic: params.topic,
    stage: params.stage,
    facet: params.facet,
  });
  const counts = getTalkTagCounts(pool);

  const activeLabel = params.topic
    ? topics.find((topic) => topic.slug === params.topic)?.shortName
    : params.stage
      ? stageLabels[params.stage as PipelineStage]
      : params.facet;

  return (
    <div className="talks-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">
            <Mic size={15} />
            Talks
          </span>
          <h1>The talk track, always open.</h1>
          <p>
            Recorded presentations from across medical XR — the sessions you would sit in
            on at a conference, available whenever you need them.
          </p>
        </div>
      </section>

      <div className="shell talks-body">
        <div className="external-note">
          <ExternalLink size={18} />
          <p>
            <strong>These are links to recordings hosted elsewhere.</strong> AVRMD
            collects and tags them so they can be found by clinical area and by stage;
            each one credits the series that hosts it.
          </p>
        </div>

        <div className="talk-filters">
          <div className="talk-filter-group">
            <span className="talk-filter-label">Clinical area</span>
            <a className={`chip${!params.topic ? " chip-active" : ""}`} href="/talks">
              All
            </a>
            {topics
              .filter((topic) => counts.topics.has(topic.slug))
              .map((topic) => (
                <a
                  className={`chip${params.topic === topic.slug ? " chip-active" : ""}`}
                  href={`/talks?topic=${topic.slug}`}
                  key={topic.slug}
                >
                  {topic.shortName} ({counts.topics.get(topic.slug)})
                </a>
              ))}
          </div>

          <div className="talk-filter-group">
            <span className="talk-filter-label">Stage</span>
            {[...counts.stages.entries()].map(([stage, count]) => (
              <a
                className={`chip${params.stage === stage ? " chip-active" : ""}`}
                href={`/talks?stage=${stage}`}
                key={stage}
              >
                {stageLabels[stage as PipelineStage]} ({count})
              </a>
            ))}
          </div>
        </div>

        <div className="result-line">
          <span>
            <strong>{results.length}</strong> {results.length === 1 ? "talk" : "talks"}
            {activeLabel ? ` in ${activeLabel}` : ""}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>No talks with that tag yet</h3>
            <p>Try a broader filter.</p>
          </div>
        ) : (
          <div className="talk-grid">
            {results.map((talk) => (
              <a className="talk-card" href={talk.url} key={talk.slug} rel="noopener" target="_blank">
                <span className="talk-card-head">
                  <Mic size={15} />
                  <ArrowUpRight size={16} />
                </span>
                <strong>{talk.title}</strong>
                {talk.speakers.length > 0 && (
                  <small className="talk-speakers">{talk.speakers.join(", ")}</small>
                )}
                <span className="talk-tags">
                  {talk.stages?.map((stage) => (
                    <span className="chip" key={stage}>
                      {stageLabels[stage]}
                    </span>
                  ))}
                </span>
                <small className="talk-host">
                  {talk.hostLabel}
                  {talk.source === "member" && talk.submittedByHandle
                    ? ` · shared by @${talk.submittedByHandle}`
                    : ""}
                </small>
              </a>
            ))}
          </div>
        )}

        <TalkSubmitForm
          stageOptions={stages.map((stage) => ({ value: stage.slug, label: stage.name }))}
          topicOptions={topics.map((topic) => ({ value: topic.slug, label: topic.shortName }))}
        />
      </div>
    </div>
  );
}
