import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { articles } from "../schema";
import { slugify } from "@/lib/review";

export type Article = typeof articles.$inferSelect;

export async function listArticles(limit = 50) {
  return getDatabase().select().from(articles).where(eq(articles.hidden, false)).orderBy(desc(articles.publishedAt)).limit(limit);
}

export async function getArticle(slug: string) {
  const [row] = await getDatabase()
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.hidden, false)))
    .limit(1);
  return row;
}

export async function latestArticle() {
  const [row] = await listArticles(1);
  return row;
}

/** Publishes under a date-stamped slug, made unique if the week already has one. */
export async function publishArticle(article: { title: string; summary: string; body: string; weekOf: string; draftedBy?: string; publishedById: string }) {
  const base = `${article.weekOf}-${slugify(article.title).slice(0, 60)}`.replace(/-+$/, "");
  let slug = base;
  for (let attempt = 2; (await getDatabase().select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1)).length; attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  const [row] = await getDatabase()
    .insert(articles)
    .values({ ...article, slug, draftedBy: article.draftedBy ?? null })
    .returning();
  return row;
}

export async function setArticleHidden(id: string, hidden: boolean) {
  await getDatabase().update(articles).set({ hidden, updatedAt: new Date() }).where(eq(articles.id, id));
}
