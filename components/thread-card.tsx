import Link from "next/link";
import { MessageCircleQuestion, MessagesSquare } from "lucide-react";
import type { CommunityThread } from "@/lib/community";
import { getEntity } from "@/lib/catalog";
import { SampleBadge } from "./sample-badge";

export function ThreadCard({ thread }: { thread: CommunityThread }) {
  const Icon = thread.kind === "question" ? MessageCircleQuestion : MessagesSquare;
  const related = thread.relatedEntitySlugs
    .map((slug) => getEntity(slug))
    .filter((entity) => entity !== undefined);

  return (
    <details className="thread-details">
      <summary>
        <span className="thread-kind">
          <Icon size={15} />
          {thread.kind === "question" ? "Question" : "Discussion"}
        </span>
        <span className="thread-headline">
          <strong>{thread.title}</strong>
          <small>{thread.excerpt}</small>
        </span>
        <span className="thread-meta">
          <SampleBadge />
          {thread.posts.length} {thread.posts.length === 1 ? "reply" : "replies"}
        </span>
      </summary>
      <div className="thread-body">
        {thread.posts.map((post, index) => (
          <article className="thread-post" key={`${thread.slug}-${index}`}>
            <span className="thread-role">
              {post.role}
              {post.official && <span className="official-tag">Official reply — example</span>}
            </span>
            <p>{post.body}</p>
          </article>
        ))}
        {related.length > 0 && (
          <div className="thread-related">
            <span>Records discussed:</span>
            {related.map((entity) => (
              <Link href={`/entities/${entity.slug}`} key={entity.slug}>
                {entity.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
