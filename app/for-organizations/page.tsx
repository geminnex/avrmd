import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Eye,
  FileCheck2,
  MailCheck,
  PencilLine,
  Search,
  ShieldCheck,
} from "lucide-react";
import { PreviewNote } from "@/components/preview-note";
import { WorkflowForm } from "@/components/workflow-form";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "For organizations",
  description:
    "Claim your organisation's record for free, keep its facts current, and promote responsibly with clearly labelled placements.",
};

const claimSteps = [
  {
    icon: Search,
    title: "Find your record",
    description: "Search the catalog for your organisation, product, or platform.",
  },
  {
    icon: MailCheck,
    title: "Verify with a work email",
    description: "A claim is checked against your organisation's own domain.",
  },
  {
    icon: PencilLine,
    title: "Maintain the official facts",
    description: "Keep the description, updates, events, and inquiry routing current.",
  },
];

const placements = [
  {
    icon: Eye,
    title: "Directory spotlight",
    description: "A labelled slot beside relevant directory and topic contexts.",
  },
  {
    icon: CalendarDays,
    title: "Event announcement",
    description: "Date-bounded promotion for conferences, webinars, and workshops.",
  },
  {
    icon: FileCheck2,
    title: "Sponsored briefing",
    description: "A separately labelled owner-authored update, reviewed for claims.",
  },
];

export default function ForOrganizationsPage() {
  const unclaimed = catalog
    .filter(
      (entity) =>
        entity.claimStatus === "unclaimed" &&
        entity.subtype !== "hardware" &&
        entity.kind !== "problem",
    )
    .slice(0, 8);

  return (
    <div className="workflow-page">
      <section className="workflow-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell workflow-hero-layout">
          <div>
            <span className="eyebrow light">For companies and institutions</span>
            <h1>Your record, where professionals are already looking.</h1>
            <p>
              People arrive at AVRMD with a clinical problem, not a brand in mind. Your
              record is where that search lands — claiming it is free, and it stays free.
            </p>
          </div>
          <div className="workflow-promise">
            <BadgeCheck size={22} />
            <strong>Claiming costs nothing</strong>
            <span>
              Promotion never buys ownership, a review state, or a better organic position.
            </span>
          </div>
        </div>
      </section>

      <section className="shell process-grid">
        {claimSteps.map(({ icon: Icon, title, description }) => (
          <div key={title}>
            <Icon size={20} />
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        ))}
      </section>

      <section className="shell claim-section" id="claim">
        <div className="claim-layout">
          <div>
            <WorkflowForm mode="claim" />
          </div>
          <aside className="claim-aside">
            <div className="sidebar-card">
              <span className="eyebrow">What a claim covers</span>
              <div className="status-line">
                <PencilLine size={17} />
                <span>
                  <strong>You maintain</strong>
                  Official description, updates, events, and where inquiries go.
                </span>
              </div>
              <div className="status-line">
                <ShieldCheck size={17} />
                <span>
                  <strong>You cannot change</strong>
                  Linked evidence, community criticism, or organic ranking.
                </span>
              </div>
              <Link className="primary-link" href="/about#owners">
                How stewardship works
              </Link>
            </div>

            {unclaimed.length > 0 && (
              <div className="sidebar-card">
                <span className="eyebrow">Unclaimed records</span>
                <p className="claim-aside-note">
                  These are live records with no verified representative yet.
                </p>
                <ul className="unclaimed-list">
                  {unclaimed.map((entity) => (
                    <li key={entity.slug}>
                      <Link href={`/entities/${entity.slug}`}>{entity.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="shell promotion-section" id="promotion">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Promotion</span>
            <h2>Visibility that stays clearly separate.</h2>
          </div>
          <p>
            Every placement is labelled, sits in its own slot, and never enters organic
            results or appears on evidence records.
          </p>
        </div>

        <div className="placement-grid">
          {placements.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon size={21} />
              <strong>{title}</strong>
              <span>{description}</span>
              <small>Always marked &ldquo;Sponsored&rdquo;</small>
            </div>
          ))}
        </div>

        <PreviewNote title="How campaigns run today">
          Placements are quoted by staff and invoiced offline — there is no self-serve
          purchase and no published rate card yet. Submitting the form below records what
          you need so we can quote it.
        </PreviewNote>

        <WorkflowForm mode="advertising" />
      </section>

      <section className="shell inline-cta">
        <div>
          <span className="eyebrow">Not listed at all?</span>
          <h2>Suggest a record before you claim it.</h2>
        </div>
        <Link className="button-primary" href="/participate">
          Submit a record
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
