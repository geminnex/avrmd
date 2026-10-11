import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Newspaper } from "lucide-react";
import { ArticleBody } from "@/components/article-body";
import type { Article } from "@/lib/db/repositories/articles";

export const revalidate = 300;

type ArticlePageProps = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<Article | undefined> {
  if (!/^[a-z0-9-]{1,140}$/.test(slug)) return undefined;
  try {
    const { getArticle } = await import("@/lib/db/repositories/articles");
    return await getArticle(slug);
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await load((await params).slug);
  return article ? { title: article.title, description: article.summary || undefined } : {};
}

export default async function WeeklyArticlePage({ params }: ArticlePageProps) {
  const article = await load((await params).slug);
  if (!article) notFound();
  const date = article.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  return (
    <article className="shell legal-page weekly-article">
      <Link className="member-back" href="/weekly">
        <ArrowLeft size={14} /> All weekly articles
      </Link>
      <span className="eyebrow">
        <Newspaper size={15} />
        Weekly · {date}
      </span>
      <h1>{article.title}</h1>
      {article.summary && <p className="weekly-summary">{article.summary}</p>}
      <ArticleBody body={article.body} />
      <p className="weekly-fineprint">
        Drafted with AI from the week&apos;s sources and edited by AVRMD&apos;s editors. Papers and news
        are linked as published and not independently reviewed. Professional information, not
        medical advice. Questions? <Link href="/ask">Ask the community</Link>.
      </p>
    </article>
  );
}
