import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LikeButton } from "./like-button";

export type PostCardData = {
  id: string;
  body: string;
  createdAt: Date;
  entitySlug: string | null;
  authorHandle: string | null;
  authorDisplayName: string | null;
  media: { url: string; mimeType: string }[];
  likeCount: number;
  commentCount: number;
  initialLiked?: boolean;
};

function timeAgo(date: Date) {
  const hours = Math.round((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

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
