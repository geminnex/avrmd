import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LikeButton } from "./like-button";
import { timeAgo } from "@/lib/time";

export type PostCardData = {
  id: string;
  body: string;
  // A real Date from a server component's direct DB read; an ISO string once
  // this crosses a client-side fetch's JSON boundary (see EntityGroupPanel).
  createdAt: Date | string;
  entitySlug: string | null;
  authorHandle: string | null;
  authorDisplayName: string | null;
  media: { url: string; mimeType: string }[];
  likeCount: number;
  commentCount: number;
  initialLiked?: boolean;
};


export function PostCard({ post, linkToPermalink = true }: { post: PostCardData; linkToPermalink?: boolean }) {
  const author = post.authorDisplayName || (post.authorHandle ? `@${post.authorHandle}` : "A member");

  return (
    <article className="post-card">
      <header className="post-card-head">
        <span className="post-avatar" aria-hidden="true">
          {author.slice(0, 1).toUpperCase()}
        </span>
        <div>
          {post.authorHandle ? (
            <Link className="post-author" href={`/members/${post.authorHandle}`}>
              {author}
            </Link>
          ) : (
            <span className="post-author">{author}</span>
          )}
          <span className="post-meta">
            {post.entitySlug && (
              <>
                <Link href={`/entities/${post.entitySlug}`}>on {post.entitySlug}</Link>
                {" · "}
              </>
            )}
            {timeAgo(post.createdAt)}
          </span>
        </div>
      </header>

      <p className="post-body">{post.body}</p>

      {post.media.length > 0 && (
        <div className="post-media">
          {post.media.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" key={item.url} loading="lazy" src={item.url} />
          ))}
        </div>
      )}

      <footer className="post-card-foot">
        <LikeButton count={post.likeCount} initialLiked={post.initialLiked} postId={post.id} />
        {linkToPermalink ? (
          <Link className="comment-count" href={`/posts/${post.id}`}>
            <MessageCircle size={15} />
            {post.commentCount > 0 ? post.commentCount : "Comment"}
          </Link>
        ) : (
          <span className="comment-count">
            <MessageCircle size={15} />
            {post.commentCount > 0 ? post.commentCount : "Comment"}
          </span>
        )}
      </footer>
    </article>
  );
}
