import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Briefcase,
  CalendarDays,
  Compass,
  ExternalLink,
  MessageCircleQuestion,
  MessagesSquare,
  Mic,
  Newspaper,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { SampleBadge } from "@/components/sample-badge";
import { TopicCard } from "@/components/topic-card";
import { catalog, entityHref, kindLabels } from "@/lib/catalog";
import { getFeed, type FeedItem } from "@/lib/feed";
import { getOpenOpportunities, opportunityKindLabels } from "@/lib/opportunities";
import { signalCategoryLabels } from "@/lib/signals";
import { getAllTalks, pickShowcaseTalks } from "@/lib/talks";
import { stageLabels } from "@/lib/stages";
import { getThread } from "@/lib/community";
import { topics } from "@/lib/topics";

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  // Handles both date-only strings (catalog.lastReviewed) and full ISO
  // timestamps (signal.discoveredAt) — appending a time part to an already-
  // complete timestamp produces an invalid date.
  const date = iso.length > 10 ? new Date(iso) : new Date(`${iso}T00:00:00Z`);
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function FeedRow({ item }: { item: FeedItem }) {
  if (item.kind === "signal") {
    const signal = item.data;
    return (
      <a className="feed-row" href={signal.url} rel="noopener" target="_blank">
        <span className="feed-tag tag-signal">{signalCategoryLabels[signal.category]}</span>
        <span className="feed-row-body">
          <strong>{signal.headline}</strong>
          <small>
            {signal.sourceLabel} · {timeAgo(signal.discoveredAt)}
          </small>
        </span>
        <ExternalLink size={15} />
      </a>
    );
  }

  if (item.kind === "record") {
    const entity = item.data;
    return (
      <Link className="feed-row" href={entityHref(entity)}>
        <span className="feed-tag tag-record">Added · {kindLabels[entity.kind]}</span>
        <span className="feed-row-body">
          <strong>{entity.name}</strong>
          <small>
            {entity.summary.slice(0, 100)}
            {entity.summary.length > 100 ? "…" : ""}
          </small>
        </span>
        <ArrowRight size={15} />
      </Link>
    );
  }

  if (item.kind === "discussion") {
    const thread = item.data;
    return (
      <Link className="feed-row" href={`/topics/${thread.topicSlug}#discussions`}>
        <span className="feed-tag tag-discussion">
          <MessagesSquare size={12} />
          Discussion
        </span>
        <span className="feed-row-body">
          <strong>{thread.title}</strong>
          <small>{thread.excerpt}</small>
        </span>
        <SampleBadge />
      </Link>
    );
  }

  const opportunity = item.data;
  return (
    <Link className="feed-row" href="/opportunities">
      <span className="feed-tag tag-opportunity">{opportunityKindLabels[opportunity.kind]}</span>
      <span className="feed-row-body">
        <strong>{opportunity.title}</strong>
        <small>{opportunity.organisation}</small>
      </span>
      <ArrowRight size={15} />
    </Link>
  );
}

export default async function HomePage() {
  const feed = getFeed(20);
  const upcomingEvents = catalog
    .filter((entity) => entity.kind === "event" && entity.eventDate)
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""))
    .slice(0, 3);
  const openOpportunities = getOpenOpportunities();
  // Re-drawn on every visit (this page is force-dynamic), so the talk track
  // surfaces something different each time rather than the same three.
  const showcaseTalks = pickShowcaseTalks(await getAllTalks(), 3);
  const spotlightThread = getThread("what-the-relievrx-clearance-covers");

  return (
    <div className="feed-page">
      <section className="masthead">
        <div className="shell masthead-inner">
          <div className="masthead-copy">
            <span className="eyebrow light">Medical XR Network</span>
            <h1>What&rsquo;s moving in medical XR.</h1>
          </div>
          <form action="/explore" className="masthead-search">
            <Search size={17} />
            <input
              aria-label="Search the AVRMD catalog"
              name="q"
              placeholder="Search a clinical need, product, or organisation"
            />
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="shell talk-showcase">
        <div className="talk-showcase-head">
          <span className="eyebrow">
            <Mic size={15} />
            From the talk track
          </span>
          <Link className="primary-link" href="/talks">
            All talks
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="talk-showcase-grid">
          {showcaseTalks.map((talk) => (
            <a
              className="talk-card"
              href={talk.url}
              key={talk.slug}
              rel="noopener"
              target="_blank"
            >
              <span className="talk-card-head">
                <Mic size={15} />
                <ExternalLink size={15} />
              </span>
              <strong>{talk.title}</strong>
              {talk.speakers.length > 0 && (
                <small className="talk-speakers">{talk.speakers.join(", ")}</small>
              )}
              <span className="talk-tags">
                {talk.stages?.slice(0, 2).map((stage) => (
                  <span className="chip" key={stage}>
                    {stageLabels[stage]}
                  </span>
                ))}
              </span>
              <small className="talk-host">{talk.hostLabel}</small>
            </a>
          ))}
        </div>
      </section>

      <div className="shell feed-layout">
        <main className="feed-main">
          <div className="section-heading feed-heading">
            <div>
              <span className="eyebrow">
                <Newspaper size={15} />
                The feed
              </span>
              <h2>New records, new evidence, and open discussion.</h2>
            </div>
            <Link className="primary-link" href="/signals">
              Full signals archive
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="feed-list">
            {feed.map((item, index) => (
              <FeedRow item={item} key={`${item.kind}-${index}`} />
            ))}
          </div>

          <AdSlot slot="topic-aside" />
        </main>

        <aside className="feed-aside">
          <div className="sidebar-card">
            <span className="eyebrow">Clinical topics</span>
            <div className="feed-topic-list">
              {topics.map((topic) => (
                <Link href={`/topics/${topic.slug}`} key={topic.slug}>
                  {topic.shortName}
                </Link>
              ))}
            </div>
            <Link className="primary-link" href="/topics">
              Start from a clinical problem
              <ArrowRight size={15} />
            </Link>
          </div>

          {upcomingEvents.length > 0 && (
            <div className="sidebar-card">
              <span className="eyebrow">
                <CalendarDays size={15} />
                Upcoming events
              </span>
              {upcomingEvents.map((event) => (
                <Link className="event-mini" href={`/entities/${event.slug}`} key={event.slug}>
                  <strong>{event.name}</strong>
                  <small>
                    {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {event.geography}
                  </small>
                </Link>
              ))}
            </div>
          )}

          {openOpportunities.length > 0 && (
            <div className="sidebar-card">
              <span className="eyebrow">
                <Briefcase size={15} />
                Opportunities
              </span>
              {openOpportunities.slice(0, 3).map((item) => (
                <Link className="event-mini" href="/opportunities" key={item.slug}>
                  <strong>{item.title}</strong>
                  <small>{item.organisation}</small>
                </Link>
              ))}
              <Link className="primary-link" href="/opportunities">
                All opportunities
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {spotlightThread && (
            <div className="sidebar-card">
              <span className="eyebrow">
                <MessageCircleQuestion size={15} />
                Community <SampleBadge />
              </span>
              <p className="feed-thread-excerpt">{spotlightThread.title}</p>
              <Link
                className="primary-link"
                href={`/topics/${spotlightThread.topicSlug}#discussions`}
              >
                Read the discussion
                <ArrowRight size={15} />
              </Link>
            </div>
          )}

          <AdSlot slot="entity-contextual" />

          <div className="sidebar-card conference-teaser">
            <Bell size={18} />
            <strong>AVRMD Conference</strong>
            <p>Watch this space — details follow once the first event is scheduled.</p>
          </div>
        </aside>
      </div>

      <section className="trust-strip">
        <div className="shell trust-strip-inner">
          <div>
            <ShieldCheck size={19} />
            <span>
              <strong>Every record cites its source</strong>
              With the date it was last reviewed.
            </span>
          </div>
          <div>
            <BadgeCheck size={19} />
            <span>
              <strong>Evidence stays independent</strong>
              Owners maintain facts, not the criticism.
            </span>
          </div>
          <div>
            <Compass size={19} />
            <span>
              <strong>Promotion never moves results</strong>
              Paid placements are labelled and separate.
            </span>
          </div>
          <Link className="primary-link" href="/about">
            How AVRMD works
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="cta-section">
        <div className="shell cta-card">
          <div>
            <span className="eyebrow">For companies and institutions</span>
            <h2>Represent your organisation — or add what is missing.</h2>
            <p>
              Claiming a record is free. Paid visibility is always labelled and never
              changes organic ranking.
            </p>
          </div>
          <div className="cta-actions">
            <Link className="button-primary" href="/for-organizations#claim">
              Claim your record
              <ArrowRight size={17} />
            </Link>
            <Link className="button-secondary" href="/for-organizations#promotion">
              Promote responsibly
            </Link>
            <Link className="button-secondary" href="/participate">
              Suggest a record
            </Link>
          </div>
          <Compass className="cta-compass" size={180} aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
