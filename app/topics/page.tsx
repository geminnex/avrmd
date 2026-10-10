import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TopicCard } from "@/components/topic-card";
import { topics } from "@/lib/topics";
import { LibraryTabs } from "@/components/section-tabs";

export const metadata: Metadata = {
  title: "Clinical topics",
  description:
    "Browse medical XR by clinical need — surgical training, simulation, pain management, rehabilitation, education, and surgical planning.",
};

export default function TopicsPage() {
  return (
    <div className="topics-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Browse by clinical need</span>
          <h1>Start from the problem you are solving.</h1>
          <p>
            Each topic gathers the solutions, organisations, evidence, and events that
            belong to one clinical need, so you can see a whole area at once.
          </p>
        </div>
      </section>
      <LibraryTabs active="topics" />

      <div className="shell topics-body">
        <div className="topic-grid">
          {topics.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>

        <div className="secondary-browse">
          <div>
            <strong>Prefer to browse by record type?</strong>
            <span>
              The full directory holds every organisation, solution, evidence record,
              event, project, and piece of hardware.
            </span>
          </div>
          <Link className="primary-link" href="/explore">
            Open the directory
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}
