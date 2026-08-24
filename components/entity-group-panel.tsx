"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImageIcon, LoaderCircle, MessagesSquare, Newspaper } from "lucide-react";
import { PostCard, type PostCardData } from "./post-card";
import { PostComposer } from "./post-composer";
import { ThreadPanel } from "./thread-panel";

type Thread = {
  thread: { id: string; title: string; status: string; createdAt: string; updatedAt: string };
  authorHandle: string | null;
  authorDisplayName: string | null;
};

type GroupData = {
  isMember: boolean;
  threads: Thread[];
  blogPosts: PostCardData[];
  media: { url: string; mimeType: string; postId: string }[];
};

type Tab = "forum" | "blog" | "media";

export function EntityGroupPanel({ slug }: { slug: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("forum");
  const [data, setData] = useState<GroupData | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [openingThread, setOpeningThread] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/entities/${slug}/group`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.ok) {
          setData({
            isMember: payload.isMember,
            threads: payload.threads,
            blogPosts: payload.blogPosts,
            media: payload.media,
          });
        }
      })
      .catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleNewThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newThreadTitle.trim()) return;
    setOpeningThread(true);

    try {
      const response = await fetch(`/api/entities/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newThreadTitle.trim() }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.ok) {
        setNewThreadTitle("");
        load();
      }
    } finally {
      setOpeningThread(false);
    }
  }

  if (!data) {
    return (
      <div className="group-panel-loading">
        <LoaderCircle className="spin" size={18} />
      </div>
    );
  }

  return (
    <section className="entity-group-panel">
      <nav className="group-panel-tabs" aria-label="Group sections">
        <button className={tab === "forum" ? "active" : ""} onClick={() => setTab("forum")} type="button">
          <MessagesSquare size={15} />
          Forum ({data.threads.length})
        </button>
        <button className={tab === "blog" ? "active" : ""} onClick={() => setTab("blog")} type="button">
          <Newspaper size={15} />
          Blog ({data.blogPosts.length})
        </button>
        <button className={tab === "media" ? "active" : ""} onClick={() => setTab("media")} type="button">
          <ImageIcon size={15} />
          Media ({data.media.length})
        </button>
      </nav>

      {tab === "forum" && (
        <div className="group-panel-body">
          <form className="new-thread-form" onSubmit={handleNewThread}>
            <input
              maxLength={200}
              minLength={5}
              onChange={(event) => setNewThreadTitle(event.target.value)}
              placeholder="Ask a question about this record…"
              value={newThreadTitle}
            />
            <button disabled={openingThread || newThreadTitle.trim().length < 5} type="submit">
              {openingThread ? <LoaderCircle className="spin" size={15} /> : <ArrowRight size={15} />}
            </button>
          </form>

          {data.threads.length === 0 ? (
            <p className="group-empty">No discussion yet — be the first to ask.</p>
          ) : (
            data.threads.map((row) => (
              <ThreadPanel entitySlug={slug} key={row.thread.id} thread={row.thread} authorHandle={row.authorHandle} authorDisplayName={row.authorDisplayName} />
            ))
          )}
        </div>
      )}

      {tab === "blog" && (
        <div className="group-panel-body">
          {data.isMember && (
            <PostComposer
              entitySlug={slug}
              kind="blog"
              onPosted={load}
              placeholder="Post an update on behalf of this record…"
            />
          )}
          {data.blogPosts.length === 0 ? (
            <p className="group-empty">
              {data.isMember
                ? "No updates yet — your first post will appear here."
                : "No updates yet from this record's team."}
            </p>
          ) : (
            <div className="post-list">
              {data.blogPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "media" && (
        <div className="group-panel-body">
          {data.media.length === 0 ? (
            <p className="group-empty">No media yet.</p>
          ) : (
            <div className="group-media-grid">
              {data.media.map((item) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" key={item.url} loading="lazy" src={item.url} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
