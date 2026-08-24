import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { getStageEntities, stages } from "@/lib/stages";

export const metadata: Metadata = {
  title: "Stages",
  description:
    "The path from a clinical idea to something that reaches patients — research, technology, design, implementation, validation, regulatory, manufacturing, and commercialization.",
};

export default function StagesPage() {
  return (
    <div className="stages-page">
      <section className="page-intro">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell">
          <span className="eyebrow light">
            <Route size={15} />
            Stages
          </span>
          <h1>Where are you stuck?</h1>
          <p>
            Clinical topics ask which medical problem you are solving. Stages ask which
            part of the journey you are on — because the hard part is rarely the idea,
            and the people who can help are different at every step.
          </p>
        </div>
      </section>

      <div className="shell stages-body">
        <ol className="stage-list">
          {stages.map((stage, index) => {
            const count = getStageEntities(stage.slug).length;
            return (
              <li key={stage.slug}>
                <Link className="stage-card" href={`/stages/${stage.slug}`}>
                  <span className="stage-number">{index + 1}</span>
                  <span className="stage-card-body">
                    <strong>{stage.name}</strong>
                    <em>{stage.question}</em>
                    <small>{stage.description}</small>
                  </span>
                  <span className="stage-card-count">{count}</span>
                  <ArrowRight className="stage-card-arrow" size={17} />
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="secondary-browse">
          <div>
            <strong>Looking for a clinical area instead?</strong>
            <span>
              Topics group the same records by the medical problem they address.
            </span>
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
