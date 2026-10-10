import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { PreviewNote } from "@/components/preview-note";
import {
  getOpenOpportunities,
  opportunityKindLabels,
  type OpportunityKind,
} from "@/lib/opportunities";

export const metadata: Metadata = {
  robots: { index: false },
  title: "Opportunities",
  description: "RFPs, RFQs, collaboration requests, and roles in medical XR.",
};

export const dynamic = "force-dynamic";

const kindAccent: Record<OpportunityKind, string> = {
  rfp: "blue",
  rfq: "teal",
  collaboration: "violet",
  job: "coral",
};

export default function OpportunitiesPage() {
  const opportunities = getOpenOpportunities();

  return (
    <div className="opportunities-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">Opportunities</span>
          <h1>RFPs, collaborations, and roles.</h1>
          <p>
            Procurement requests, research collaborations, and open roles in medical XR,
            posted by the organisations behind them.
          </p>
        </div>
      </section>

      <div className="shell opportunities-body">
        {opportunities.length === 0 ? (
          <div className="empty-state">
            <Briefcase className="empty-orbit" size={64} strokeWidth={1.2} />
            <h3>No open listings yet</h3>
            <p>
              This board is genuinely empty rather than seeded — the first listing will be
              a real one.
            </p>
            <PreviewNote title="Posting">
              Posting a listing from the site isn&apos;t built yet. If you have one, send it
              as a suggestion and an editor will add it.
            </PreviewNote>
            <Link className="primary-link" href="/participate">
              Suggest a listing
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="entity-grid">
            {opportunities.map((item) => (
              <a
                className={`opportunity-card accent-${kindAccent[item.kind]}`}
                href={item.url ?? "#"}
                key={item.slug}
              >
                <span className="kind-label">{opportunityKindLabels[item.kind]}</span>
                <strong>{item.title}</strong>
                <small>{item.organisation}</small>
                <p>{item.summary}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
