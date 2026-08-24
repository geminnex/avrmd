import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntity } from "@/lib/catalog";
import { listThreadsForEntity } from "@/lib/db/repositories/community";
import { getUserMembership } from "@/lib/db/repositories/memberships";
import { listMediaForEntity, listPostsByEntity } from "@/lib/db/repositories/posts";

type Params = { params: Promise<{ slug: string }> };

/**
 * One call for the whole group panel — public read data plus a
 * viewer-specific `isMember` flag. Kept as a client-fetched island (see
 * components/entity-group-panel.tsx) so /entities/[slug] itself stays a
 * statically prerendered page rather than becoming dynamic just to check
 * membership for one visitor.
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (!getEntity(slug)) {
    return NextResponse.json({ ok: false, message: "Unknown record." }, { status: 404 });
  }

  const user = await getCurrentUser();

  const [threads, blogPosts, media, membership] = await Promise.all([
    listThreadsForEntity(slug),
    listPostsByEntity(slug, "blog"),
    listMediaForEntity(slug),
    user ? getUserMembership(user.id, slug) : Promise.resolve(undefined),
  ]);

  return NextResponse.json({
    ok: true,
    isMember: Boolean(membership),
    threads,
    blogPosts,
    media,
  });
}
