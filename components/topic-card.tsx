import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { kindLabels } from "@/lib/catalog";
import { getTopicEntitiesByKind, type Topic } from "@/lib/topics";
import type { EntityKind } from "@/lib/catalog-types";

/** kindLabels are plural; a count of one needs the singular. */
function countLabel(kind: EntityKind, count: number) {
  const label = kindLabels[kind].toLowerCase();
  return count === 1 ? label.replace(/s$/, "") : label;
}

export function TopicCard({ topic }: { topic: Topic }) {
  const groups = getTopicEntitiesByKind(topic);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Link className={`topic-card accent-${topic.accent}`} href={`/topics/${topic.slug}`}>
      <span className="topic-card-head">
        <strong>{topic.shortName}</strong>
        <span className="topic-card-total">{total}</span>
      </span>
      <small>{topic.tagline}</small>
      <span className="topic-card-counts">
        {groups.map((group) => (
          <span key={group.kind}>
            {group.items.length} {countLabel(group.kind, group.items.length)}
          </span>
        ))}
      </span>
      <ArrowRight className="topic-card-arrow" size={17} />
    </Link>
  );
}
