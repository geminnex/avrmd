import Link from "next/link";
import { stageLabels } from "@/lib/stages";
import { topics } from "@/lib/topics";
import type { PipelineStage } from "@/lib/catalog-types";
import type { QuestionTags as Tags } from "@/lib/questions";

/** Every tag links to the question list filtered by it. */
export function QuestionTags({ tags, highlight = [] }: { tags: Tags; highlight?: string[] }) {
  return (
    <span className="talk-tags question-tags">
      {tags.facets.map((name) => (
        <Link
          className={`chip${highlight.includes(name) ? " chip-match" : ""}`}
          href={`/questions?facet=${encodeURIComponent(name)}`}
          key={`f-${name}`}
        >
          {name}
        </Link>
      ))}
      {tags.stages.map((stage) => (
        <Link className="chip chip-stage" href={`/questions?stage=${stage}`} key={`s-${stage}`}>
          {stageLabels[stage as PipelineStage] ?? stage}
        </Link>
      ))}
      {tags.topicSlugs.map((slug) => (
        <Link className="chip chip-topic" href={`/questions?topic=${slug}`} key={`t-${slug}`}>
          {topics.find((topic) => topic.slug === slug)?.shortName ?? slug}
        </Link>
      ))}
    </span>
  );
}
