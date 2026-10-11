import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Compass,
  FileText,
  Landmark,
  MessageCircleQuestion,
  Mic,
  Route,
  ShieldCheck,
} from "lucide-react";
import { HomeAsk } from "@/components/home-ask";
import { getFdaDeviceList } from "@/lib/fda-devices";
import { getSignals, signalCategoryLabels } from "@/lib/signals";
import { stages } from "@/lib/stages";
import { getAllTalks, pickShowcaseTalks } from "@/lib/talks";
import { daysAgo, timeAgo } from "@/lib/time";
import { topics } from "@/lib/topics";

// Rebuilt at most every five minutes instead of on every visit: the robot's
// data, new questions and the talk shuffle are all fresh enough at that pace,
// and the home page no longer costs a database round-trip per visitor.
export const revalidate = 300;

async function recentQuestions() {
  try {
    const { listQuestions } = await import("@/lib/db/repositories/questions");
    return (await listQuestions()).slice(0, 4);
  } catch {
    return [];
  }
}

async function latestWeekly() {
  try {
    const { latestArticle } = await import("@/lib/db/repositories/articles");
    return await latestArticle();
  } catch {
    return undefined;
  }
}

export default async function HomePage() {
  const devices = getFdaDeviceList().devices.slice(0, 4);
  const research = getSignals()
    .filter((signal) => signal.category === "research" || signal.category === "trial")
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt))
    .slice(0, 5);
  const [questions, weekly] = await Promise.all([recentQuestions(), latestWeekly()]);
  // A new draw every revalidation window, so returning visitors see other talks.
  const talks = pickShowcaseTalks(await getAllTalks(), 3, Math.floor(Date.now() / 300_000));

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell home-hero-inner">
          <span className="eyebrow light">Medical VR · AR · MR</span>
          <h1>Ask the medical XR community.</h1>
          <p>
            Answers drawn from FDA records, papers, trials, talks and the people who have
            built and used these systems — each one linked to its source.
          </p>
          <HomeAsk />
        </div>
      </section>

      {weekly && (
        <div className="shell">
          <Link className="home-weekly" href={`/weekly/${weekly.slug}`}>
            <span>
              <small>This week in medical XR</small>
              <strong>{weekly.title}</strong>
              {weekly.summary && <em>{weekly.summary}</em>}
            </span>
            <ArrowRight size={20} />
          </Link>
        </div>
      )}

      <section className="shell home-new">
        <div className="home-column">
          <div className="home-column-head">
            <span className="eyebrow">
              <Landmark size={15} />
              New FDA authorizations
            </span>
            <Link href="/clearances">All {getFdaDeviceList().devices.length}</Link>
          </div>
          {devices.map((device) => (
            <a className="home-item" href={device.fdaUrl} key={device.submission} rel="noreferrer" target="_blank">
              <strong>{device.name}</strong>
              <small>
                {device.company} · {device.panel} · {device.decisionDate}
              </small>
            </a>
          ))}
        </div>

        <div className="home-column">
          <div className="home-column-head">
            <span className="eyebrow">
              <FileText size={15} />
              Latest papers and trials
            </span>
            <Link href="/signals">All</Link>
          </div>
          {research.map((signal) => (
            <a className="home-item" href={signal.url} key={signal.id} rel="noopener" target="_blank">
              <strong>{signal.headline}</strong>
              <small>
                {signalCategoryLabels[signal.category]} · {signal.sourceLabel} · {daysAgo(signal.discoveredAt)}
              </small>
            </a>
          ))}
        </div>

        <div className="home-column">
          <div className="home-column-head">
            <span className="eyebrow">
              <MessageCircleQuestion size={15} />
              Questions from members
            </span>
            <Link href="/questions">All</Link>
          </div>
          {questions.length === 0 ? (
            <div className="home-empty">
              <p>
                No one has asked yet. Questions go straight to the members who said they can
                help with the topic.
              </p>
              <Link className="primary-link" href="/ask">
                Ask the first question
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            questions.map((question) => (
              <Link className="home-item" href={`/questions/${question.id}`} key={question.id}>
                <strong>{question.title}</strong>
                <small>
                  {question.answerCount} {question.answerCount === 1 ? "answer" : "answers"} ·{" "}
                  {timeAgo(question.createdAt)}
                </small>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="shell home-paths">
        <div>
          <span className="eyebrow">
            <Route size={15} />
            Where are you stuck?
          </span>
          <div className="chip-row">
            {stages.map((stage) => (
              <Link className="chip" href={`/stages/${stage.slug}`} key={stage.slug}>
                {stage.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <span className="eyebrow">
            <Compass size={15} />
            Clinical areas
          </span>
          <div className="chip-row">
            {topics.map((topic) => (
              <Link className="chip" href={`/topics/${topic.slug}`} key={topic.slug}>
                {topic.shortName}
              </Link>
            ))}
          </div>
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
          {talks.map((talk) => (
            <a className="talk-card" href={talk.url} key={talk.slug} rel="noopener" target="_blank">
              <span className="talk-card-head">
                <Mic size={15} />
                <ArrowUpRight size={15} />
              </span>
              <strong>{talk.title}</strong>
              {talk.speakers.length > 0 && <small className="talk-speakers">{talk.speakers.join(", ")}</small>}
              <small className="talk-host">{talk.hostLabel}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-strip-inner">
          <div>
            <ShieldCheck size={19} />
            <span>
              <strong>Every answer cites its source</strong>
              Records, FDA entries, papers and talks are linked.
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
            <h2>Represent your organization — or add what is missing.</h2>
            <p>Claiming a record is free. An editor confirms it and replies by email.</p>
          </div>
          <div className="cta-actions">
            <Link className="button-primary" href="/for-organizations#claim">
              Claim your record
              <ArrowRight size={17} />
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
