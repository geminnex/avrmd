"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";

type Comment = {
  comment: { id: string; body: string; createdAt: string | Date };
  authorHandle: string | null;
  authorDisplayName: string | null;
};

export function CommentThread({
  postId,
  comments: initial,
  signedIn,
}: {
  postId: string;
  comments: Comment[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      const payload = await response.json();
      if (payload.ok) {
        setComments((current) => [
          ...current,
          { comment: payload.comment, authorHandle: null, authorDisplayName: "You" },
        ]);
        setBody("");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="comment-thread">
      <h2>{comments.length} {comments.length === 1 ? "comment" : "comments"}</h2>

      {comments.map(({ comment, authorHandle, authorDisplayName }) => {
        const author = authorDisplayName || (authorHandle ? `@${authorHandle}` : "A member");
        return (
          <div className="comment-row" key={comment.id}>
            <span className="post-avatar" aria-hidden="true">
              {author.slice(0, 1).toUpperCase()}
            </span>
            <div>
              {authorHandle ? (
                <Link className="post-author" href={`/members/${authorHandle}`}>
                  {author}
                </Link>
              ) : (
                <span className="post-author">{author}</span>
              )}
              <p>{comment.body}</p>
            </div>
          </div>
        );
      })}

      {signedIn ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <input
            maxLength={1000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a comment…"
            value={body}
          />
          <button disabled={pending || !body.trim()} type="submit">
            {pending ? <LoaderCircle className="spin" size={15} /> : <ArrowRight size={15} />}
          </button>
        </form>
      ) : (
        <p className="comment-signin-note">
          <Link href="/sign-in">Sign in</Link> to comment.
        </p>
      )}
    </section>
  );
}
