import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessagesSquare, ShieldAlert } from "lucide-react";
import { PreviewNote } from "@/components/preview-note";
import { ThreadCard } from "@/components/thread-card";
import { getThreadsByTopic } from "@/lib/community";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Questions and discussion about medical XR, organised by clinical topic.",
};

export default function CommunityPage() {
  const groups = getThreadsByTopic();

  return (
    <div className="community-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Community</span>
          <h1>Questions, organised by clinical topic.</h1>
          <p>
            Implementation questions rarely have a published answer. This is where people
            who have already run the pilot, fought the procurement, or rewritten the
            curriculum compare notes.
          </p>
        </div>
      </section>

      <div className="shell community-layout">
        <div className="community-main">
          <PreviewNote title="Examples">
            The discussions below are illustrative samples showing how topic-scoped Q&amp;A
            will work. Posting opens with accounts.
          </PreviewNote>

          {groups.map((group) => (
            <section className="community-topic-group" key={group.topic.slug}>
              <div className="community-topic-head">
                <h2>{group.topic.shortName}</h2>
                <Link href={`/topics/${group.topic.slug}`}>
                  Open topic
                  <ArrowRight size={15} />
                </Link>
              </div>
              {group.threads.map((thread) => (
                <ThreadCard key={thread.slug} thread={thread} />
              ))}
            </section>
          ))}
        </div>

        <aside className="community-aside">
          <div className="sidebar-card">
            <span className="eyebrow">How this works</span>
            <div className="status-line">
              <MessagesSquare size={17} />
              <span>
                <strong>Scoped to topics</strong>
                Questions sit with the clinical area they belong to.
              </span>
            </div>
            <div className="status-line">
              <BadgeCheck size={17} />
              <span>
                <strong>Official replies labelled</strong>
                Owners can answer, but cannot remove criticism.
              </span>
            </div>
            <div className="status-line">
              <ShieldAlert size={17} />
              <span>
                <strong>Independent moderation</strong>
                Reports go to staff, not to the organisations discussed.
              </span>
            </div>
            <Link className="primary-link" href="/about#community">
              Community rules
            </Link>
          </div>

          <div className="sidebar-card professional-note">
            <strong>No patient information</strong>
            <p>
              Discussions are professional and general. Do not post patient or personal
              health information, and do not seek advice for an individual case.
            </p>
          </div>

          <div className="sidebar-card">
            <strong>Want to take part?</strong>
            <p>
              Accounts are not open yet. Meanwhile you can suggest a record that is missing
              from the catalog.
            </p>
            <Link className="primary-link" href="/participate">
              Suggest a record
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
