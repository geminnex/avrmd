import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { AssistantTrigger } from "@/components/assistant-trigger";
import { PreviewNote } from "@/components/preview-note";
import { WorkflowForm } from "@/components/workflow-form";

export const metadata: Metadata = {
  title: "Ask AVRMD",
  description:
    "A catalog-grounded assistant that finds records rather than generating claims about medicine.",
};

const boundaries = [
  {
    icon: Search,
    title: "It searches, it does not author",
    description:
      "Answers are assembled from stored record fields, each with its own source link.",
  },
  {
    icon: ShieldCheck,
    title: "It will say it does not know",
    description:
      "If no record matches, it says so and offers to take a submission instead.",
  },
  {
    icon: Workflow,
    title: "It never gives clinical advice",
    description:
      "No diagnosis, treatment guidance, or claim about effectiveness for a patient.",
  },
];

export default function AiPage() {
  return (
    <div className="ai-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Ask AVRMD</span>
          <h1>Ask in your own words.</h1>
          <p>
            Describe the clinical problem you are trying to solve and the assistant points
            you at the records that address it — the solutions, the organisations behind
            them, and the evidence, each with its source.
          </p>
          <div className="ai-hero-actions">
            <AssistantTrigger />
            <span>or press &ldquo;/&rdquo; anywhere on the site</span>
          </div>
        </div>
      </section>

      <div className="shell ai-body">
        <section className="ai-explainer">
          <div className="section-heading">
            <div>
              <span className="eyebrow">How it answers</span>
              <h2>Ordinary matching first, a model only when needed.</h2>
            </div>
            <p>
              Most questions are answered instantly in your browser by matching your words
              against the catalog&rsquo;s own vocabulary. Nothing leaves the page.
            </p>
          </div>

          <div className="ai-steps">
            <div>
              <span>1</span>
              <strong>Your words are mapped to catalog vocabulary</strong>
              <small>
                &ldquo;Back pain&rdquo; becomes the pain-management topic; &ldquo;headset&rdquo;
                becomes hardware.
              </small>
            </div>
            <div>
              <span>2</span>
              <strong>Records are ranked and returned</strong>
              <small>
                Deterministic scoring over names, specialties, use cases, and modalities.
              </small>
            </div>
            <div>
              <span>3</span>
              <strong>Unusual phrasing may go to a model</strong>
              <small>
                Only to restate your question in catalog terms — never to write the answer.
              </small>
            </div>
            <div>
              <span>4</span>
              <strong>The same local search runs again</strong>
              <small>
                So results always trace to a stored record, whether a model helped or not.
              </small>
            </div>
          </div>

          <div className="ai-boundaries">
            {boundaries.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <Icon size={19} />
                <strong>{title}</strong>
                <small>{description}</small>
              </div>
            ))}
          </div>

          <p className="ai-footnote">
            <Sparkles size={15} />
            If no model is configured or reachable, search works exactly as before.{" "}
            <Link href="/about#ai">Full AI policy</Link>
          </p>
        </section>

        <section className="ai-research">
          <div className="section-heading">
            <div>
              <span className="eyebrow">For editors</span>
              <h2>Propose a source for AI-assisted extraction.</h2>
            </div>
            <p>
              Editors can queue an allowlisted source for structured extraction. Every
              suggestion is compared against the source before anything publishes.
            </p>
          </div>

          <PreviewNote title="Editor tooling">
            Research jobs are validated here but not executed — model credentials and the
            editorial approval queue are not connected yet.
          </PreviewNote>

          <WorkflowForm mode="ai_job" />
        </section>

        <div className="secondary-browse">
          <div>
            <strong>Prefer to browse?</strong>
            <span>The clinical topics cover the same ground without asking a question.</span>
          </div>
          <Link className="primary-link" href="/topics">
            Browse clinical topics
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}
