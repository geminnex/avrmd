import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { PostComposer } from "@/components/post-composer";
import { PostCard } from "@/components/post-card";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { hasLiked, listRecentPosts } from "@/lib/db/repositories/posts";

export const metadata: Metadata = { title: "Network" };
export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const user = await requireUserOrRedirect("/sign-in?next=/network");
  const posts = await listRecentPosts(25);
  const likedStates = await Promise.all(posts.map((post) => hasLiked(post.id, user.id)));

  return (
    <div className="network-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">
            <Newspaper size={15} />
            Network
          </span>
          <h1>Updates from medical XR members.</h1>
          <p>Share what you&rsquo;re working on and see what colleagues are posting.</p>
        </div>
      </section>

      <div className="shell network-body">
        <PostComposer />

        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>Nothing posted yet</h3>
            <p>Be the first to share an update.</p>
          </div>
        ) : (
          <div className="post-list">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  initialLiked: likedStates[index],
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
