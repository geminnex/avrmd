import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import type { Article } from "@/lib/db/repositories/articles";

export const metadata: Metadata = {
  title: "Weekly",
  description: "Every Sunday: the week in medical XR — new FDA authorizations, papers, trials, industry news and community questions, in a few minutes.",
};

export const revalidate = 300;

async function load(): Promise<Article[]> {
  try {
    const { listArticles } = await import("@/lib/db/repositories/articles");
    return await listArticles(60);
  } catch {
    return [];
  }
}

const formatDate = (value: Date) => value.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default async function WeeklyPage() {
  const articles = await load();
  return (
    <div className="shell legal-page weekly-page">
      <span className="eyebrow">
        <Newspaper size={15} />
        Weekly
      </span>
      <h1>This week in medical XR</h1>
      <p>
        Every Sunday our editors sum up the week: new FDA authorizations, papers and trials,
        industry news and what the community is asking, with links to everything on AVRMD.
        Drafted with AI from the week&apos;s sources, edited and approved by a person.
      </p>
      {articles.length === 0 ? (
        <p className="queue-empty">The first article comes out on Sunday.</p>
      ) : (
        <ul className="weekly-list">
          {articles.map((article) => (
            <li key={article.id}>
              <small>{formatDate(article.publishedAt)}</small>
              <Link href={`/weekly/${article.slug}`}>
                <strong>{article.title}</strong>
              </Link>
              {article.summary && <p>{article.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
