"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircleQuestion } from "lucide-react";

type ThreadPost = {
  post: { id: string; body: string; isOfficial: boolean; createdAt: string };
  authorHandle: string | null;
  authorDisplayName: string | null;
};

type ThreadPanelProps = {
  entitySlug: string;
  thread: { id: string; title: string; updatedAt: string };
  authorHandle: string | null;
  authorDisplayName: string | null;
};

/** Real, DB-backed threads — distinct from the seeded sample threads in components/thread-card.tsx. */
export function ThreadPanel({ entitySlug, thread, authorHandle, authorDisplayName }: ThreadPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<ThreadPost[] | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && posts === null) {
      fetch(`/api/entities/${entitySlug}/threads/${thread.id}/posts`)
        .then((response) => (response.ok ? response.json() : { posts: [] }))
        .then((payload) => setPosts(payload.posts ?? []))
        .catch(() => setPosts([]));
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);

    try {
      const response = await fetch(`/api/entities/${entitySlug}/threads/${thread.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.ok) {
        const payload = await response.json();
        setPosts((current) => [
          ...(current ?? []),
          { post: payload.post, authorHandle: null, authorDisplayName: "You" },
        ]);
        setReply("");
      }
    } finally {
      setSending(false);
    }
  }

  const author = authorDisplayName || (authorHandle ? `@${authorHandle}` : "A member");

  return (
    <details className="thread-details" onToggle={toggle} open={open}>
      <summary>
        <span className="thread-kind">
          <MessageCircleQuestion size={15} />
          Question
        </span>
        <span className="thread-headline">
          <strong>{thread.title}</strong>
          <small>
            Opened by{" "}
            {authorHandle ? <Link href={`/members/${authorHandle}`}>{author}</Link> : author}
          </small>
        </span>
      </summary>
      <div className="thread-body">
        {posts === null ? (
          <LoaderCircle className="spin" size={16} />
        ) : posts.length === 0 ? (
          <p className="group-empty">No replies yet.</p>
        ) : (
          posts.map(({ post, authorHandle: replyHandle, authorDisplayName: replyName }) => (
            <article className="thread-post" key={post.id}>
              <span className="thread-role">
                {replyName || (replyHandle ? `@${replyHandle}` : "A member")}
                {post.isOfficial && <span className="official-tag">Official reply</span>}
              </span>
              <p>{post.body}</p>
            </article>
          ))
        )}
        <form className="comment-form" onSubmit={handleReply}>
          <input
            maxLength={2000}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Write a reply…"
            value={reply}
          />
          <button disabled={sending || !reply.trim()} type="submit">
            {sending ? <LoaderCircle className="spin" size={15} /> : "Reply"}
          </button>
        </form>
      </div>
    </details>
  );
}
