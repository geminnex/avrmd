import type { Metadata } from "next";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import {
  getSignalsByCategory,
  signalCategories,
  signalCategoryLabels,
  type SignalCategory,
} from "@/lib/signals";

export const metadata: Metadata = {
  title: "Signals",
  description:
    "A daily feed of new medical XR research, trials, and regulatory clearances, sourced from allowlisted registries.",
};

export const dynamic = "force-dynamic";

type SignalsPageProps = {
  searchParams: Promise<{ category?: string }>;
};

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.round(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default async function SignalsPage({ searchParams }: SignalsPageProps) {
  const params = await searchParams;
  const category: SignalCategory | "all" =
    params.category && (signalCategories as readonly string[]).includes(params.category)
      ? (params.category as SignalCategory)
      : "all";

  const signals = getSignalsByCategory(category);

  return (
    <div className="signals-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Signals</span>
          <h1>What is new in medical XR today.</h1>
          <p>
            A daily check of allowlisted registries — new trials, regulatory clearances,
            and published research. These are headlines pointing outward, not reviewed
            AVRMD records.
          </p>
        </div>
      </section>

      <div className="shell signals-body">
        <div className="external-note">
          <ExternalLink size={18} />
          <p>
            <strong>Signals are unreviewed.</strong> They carry a source and a date, not a
            trust badge. Good ones are promoted into full catalog records over time.
          </p>
        </div>

        <div className="scope-filter" role="group" aria-label="Filter signals">
          <a className={`chip${category === "all" ? " chip-active" : ""}`} href="/signals">
            All
          </a>
          {signalCategories.map((item) => (
            <a
              className={`chip${category === item ? " chip-active" : ""}`}
              href={`/signals?category=${item}`}
              key={item}
            >
              {signalCategoryLabels[item]}
            </a>
          ))}
        </div>

        {signals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orbit" />
            <h3>No signals yet</h3>
            <p>The daily check has not found anything in this category.</p>
          </div>
        ) : (
          <div className="signal-list">
            {signals.map((signal) => (
              <a
                className="signal-row"
                href={signal.url}
                key={signal.id}
                rel="noopener"
                target="_blank"
              >
                <span className={`signal-category cat-${signal.category}`}>
                  {signalCategoryLabels[signal.category]}
                </span>
                <span className="signal-body">
                  <strong>{signal.headline}</strong>
                  <small>
                    {signal.sourceLabel}
                    {timeAgo(signal.discoveredAt) ? ` · ${timeAgo(signal.discoveredAt)}` : ""}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
