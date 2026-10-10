import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Bot,
  CircleDot,
  Megaphone,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About and how AVRMD works",
  description:
    "What AVRMD is, how records are reviewed, how ownership and advertising are kept separate, and what is live today.",
};

const sections = [
  { id: "mission", label: "What AVRMD is" },
  { id: "reviews", label: "How records are reviewed" },
  { id: "sources", label: "Sources" },
  { id: "owners", label: "Ownership claims" },
  { id: "advertising", label: "Advertising" },
  { id: "ai", label: "AI" },
  { id: "community", label: "Community" },
  { id: "safety", label: "Safety boundary" },
  { id: "status", label: "What is live today" },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">About</span>
          <h1>How AVRMD works.</h1>
          <p>
            One page for the whole method: what gets into the catalog, who can change it,
            how promotion stays separate from evidence, and what is actually running today.
          </p>
        </div>
      </section>

      <div className="shell about-body">
        <nav className="about-nav" aria-label="On this page">
          {sections.map((section) => (
            <a href={`#${section.id}`} key={section.id}>
              {section.label}
            </a>
          ))}
        </nav>

        <div className="about-content">
          <section className="detail-section" id="mission">
            <span className="eyebrow">What AVRMD is</span>
            <h2>A source-linked map of medical XR</h2>
            <p>
              AVRMD is a professional reference for virtual, augmented, and mixed reality
              in healthcare. It does three things: it keeps a structured database of
              organisations, solutions, evidence, events, projects, and hardware; it gives
              professionals a place to discuss what actually works; and it gives companies
              and institutions a way to maintain their own record and promote responsibly.
            </p>
            <p>
              &ldquo;Medical XR&rdquo; is the umbrella term. VR, AR, and MR remain
              explicit filters, and &ldquo;MX&rdquo; is kept as a search alias.
            </p>
          </section>

          <section className="detail-section" id="reviews">
            <span className="eyebrow">Review states</span>
            <h2>How records are reviewed</h2>
            <p>
              Every record carries a review state describing how far it has been checked.
              A review state describes provenance only. It is never a statement about
              clinical effectiveness, safety, or regulatory approval.
            </p>
            <div className="about-states">
              <div>
                <ShieldCheck size={19} />
                <span>
                  <strong>Source reviewed</strong>
                  Staff opened the cited source and checked the record fields against it.
                </span>
              </div>
              <div>
                <CircleDot size={19} />
                <span>
                  <strong>Metadata reviewed</strong>
                  High-level description checked; individual claims need separate review.
                </span>
              </div>
              <div>
                <BadgeCheck size={19} />
                <span>
                  <strong>Claimed</strong>
                  An approved representative maintains the official facts on the record.
                </span>
              </div>
              <div>
                <Bot size={19} />
                <span>
                  <strong>AI-assisted</strong>
                  AI proposed one or more fields. A person approved them before publication.
                </span>
              </div>
            </div>
            <p>
              Each record also shows the date it was last reviewed, because a regulatory
              or product fact that was correct last year may not be correct now.
            </p>
          </section>

          <section className="detail-section" id="sources">
            <span className="eyebrow">Provenance</span>
            <h2>Sources</h2>
            <p>
              Every public record links to the source it came from — a regulator&rsquo;s
              record, a journal, or an organisation&rsquo;s own site. AVRMD stores citation
              metadata and its own short summary. It does not republish articles,
              abstracts, or media it has no right to reproduce.
            </p>
            <p>
              Collection is limited to allowlisted metadata APIs, feeds, open-licence
              repositories, official owner domains, and URLs supplied by editors with a
              documented rights basis. AVRMD does not crawl the open web indiscriminately
              or bypass paywalls, robots rules, or source terms.
            </p>
          </section>

          <section className="detail-section" id="owners">
            <span className="eyebrow">Stewardship</span>
            <h2>Ownership claims</h2>
            <p>
              Claiming a page is free and always will be. A claim is verified with a
              work-domain email and gives a representative control over the official facts
              on that record: description, updates, events, and inquiry routing.
            </p>
            <p>
              A claim does not extend further than that. Owners cannot remove linked
              evidence, delete criticism, alter another organisation&rsquo;s record, or
              change where their record ranks. Moderation stays independent of the people
              being discussed.
            </p>
            <Link className="primary-link" href="/for-organizations">
              Claim a record
            </Link>
          </section>

          <section className="detail-section" id="advertising">
            <span className="eyebrow">Commercial separation</span>
            <h2>Advertising</h2>
            <div className="about-rule-list">
              <p>
                <Megaphone size={17} />
                Every paid placement is labelled &ldquo;Sponsored&rdquo; and sits in a
                slot of its own. Paid placement never enters organic results.
              </p>
              <p>
                <ShieldCheck size={17} />
                Sponsorship never changes a trust badge, a review state, an evidence link,
                or the order of search results.
              </p>
              <p>
                <ShieldAlert size={17} />
                No targeting on personal health information, inferred conditions, or
                sensitive behaviour. Placement is contextual only.
              </p>
            </div>
            <p>
              Campaigns are quoted by staff and invoiced offline. There is no self-serve
              ad purchase, and evidence records never carry advertising.
            </p>
          </section>

          <section className="detail-section" id="ai">
            <span className="eyebrow">AI policy</span>
            <h2>How AI is used</h2>
            <p>
              Ask AVRMD first searches what is already on this site: catalog records, the
              FDA&rsquo;s list of authorized AR/VR devices, the papers, trials and news the
              daily discovery job collects, talks, stage guides, and member questions. A
              language model then writes a short answer from those sources only, numbering
              each claim to the source it came from. A citation to anything it was not given
              is removed before you see it, and if the sources do not answer the question it
              says so.
            </p>
            <p>
              The links it suggests next are generated by the site, not by the model. The
              model is never sent anything about members beyond a count of people who offered
              help; it runs through providers that do not retain or train on requests, and
              usage is capped daily. When no model is available, you get the matching sources
              without the written summary. It is professional information, never medical
              advice.
            </p>
            <p>
              AI never publishes anything on its own. Where AI proposes fields for a
              record, an editor reviews a source-versus-draft comparison and approves or
              rejects it before it appears.
            </p>
          </section>

          <section className="detail-section" id="community">
            <span className="eyebrow">Discussion</span>
            <h2>Community</h2>
            <div className="about-rule-list">
              <p>
                <MessagesSquare size={17} />
                Discussion is organised by clinical topic so questions reach the people who
                have faced them.
              </p>
              <p>
                <BadgeCheck size={17} />
                A verified owner&rsquo;s reply is labelled as official. It carries no power
                to remove other replies.
              </p>
              <p>
                <ShieldAlert size={17} />
                Reports go to staff moderation, which is independent of the organisations
                being discussed.
              </p>
            </div>
          </section>

          <section className="detail-section" id="safety">
            <span className="eyebrow">Boundary</span>
            <h2>Safety boundary</h2>
            <p>
              AVRMD is professional reference information. It does not provide diagnosis,
              treatment recommendations, or clinical consultation, and nothing here should
              be used to make a care decision for an individual patient.
            </p>
            <p>
              Do not post patient information or personal health information anywhere on
              AVRMD, including inquiries and discussions. Regulatory status shown on a
              record is specific to a region and a date, and it belongs to the product or
              system described — never to general-purpose hardware it runs on.
            </p>
          </section>

          <section className="detail-section about-status" id="status">
            <span className="eyebrow">Status</span>
            <h2>What is live today</h2>
            <p>
              AVRMD is being built in the open, and it is more useful to say plainly which
              parts are real than to imply that everything is.
            </p>
            <div className="about-status-grid">
              <div>
                <strong>Working now</strong>
                <ul>
                  <li>The catalog, topic hubs, stage guides, talks, gear and related websites.</li>
                  <li>
                    The FDA&rsquo;s list of authorized AR/VR devices and a daily feed of new
                    papers, trials and news, both refreshed by a robot every day.
                  </li>
                  <li>Ask AVRMD, which answers from those sources and cites them.</li>
                  <li>
                    Accounts (email and password, or Google), member profiles, the member
                    directory, questions and answers with notifications, and posts.
                  </li>
                  <li>
                    Suggesting a record, claiming one, and promotion enquiries: stored and
                    sent to the editors, who reply by email.
                  </li>
                </ul>
              </div>
              <div>
                <strong>Not built yet</strong>
                <ul>
                  <li>
                    A review screen: robot-found candidates and your suggestions are
                    reviewed by an editor outside the site, so publishing takes time.
                  </li>
                  <li>Email notifications and digests; notifications are on the site only.</li>
                  <li>Posting opportunities and live sessions.</li>
                  <li>
                    The topic discussions on the Community page, which are labelled samples.
                  </li>
                </ul>
              </div>
            </div>
            <p>
              Where a page shows example content, it says so on the page. Everything else on
              this list is checked against the code each time it changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
