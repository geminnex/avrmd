import { isUuid } from "@/lib/ids";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { CommentThread } from "@/components/comment-thread";
import { getCurrentUser } from "@/lib/auth/session";
import { countLikes, getPost, hasLiked, listComments } from "@/lib/db/repositories/posts";

type PostPageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [post, viewer] = await Promise.all([getPost(id), getCurrentUser()]);
  if (!post) notFound();

  const [comments, likeCount, liked] = await Promise.all([
    listComments(id),
    countLikes(id),
    viewer ? hasLiked(id, viewer.id) : Promise.resolve(false),
  ]);

  return (
    <div className="shell post-page">
      <Link className="back-link" href="/network">
        ← Network
      </Link>
      <PostCard
        linkToPermalink={false}
        post={{ ...post, initialLiked: liked, likeCount, commentCount: comments.length }}
      />
      <CommentThread comments={comments} postId={post.id} signedIn={Boolean(viewer)} />
    </div>
  );
}
