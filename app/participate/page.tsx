import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, FileSearch, Scale, UsersRound } from "lucide-react";
import { PreviewNote } from "@/components/preview-note";
import { WorkflowForm } from "@/components/workflow-form";

export const metadata: Metadata = {
  title: "Suggest a record",
  description: "Add a missing medical XR organisation, solution, study, event, or project.",
};

export default function ParticipatePage() {
  return (
    <div className="workflow-page">
      <section className="workflow-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell workflow-hero-layout">
          <div>
            <span className="eyebrow light">Contribute</span>
            <h1>Add what is missing from the map.</h1>
            <p>
              If you know a study, product, programme, or event that colleagues would
              struggle to find, adding it here makes it findable for everyone searching
              the same clinical problem.
            </p>
          </div>
          <div className="workflow-promise">
            <FileSearch size={22} />
            <strong>Source first</strong>
            <span>
              Every submission needs a canonical source, so the record can be checked.
            </span>
          </div>
        </div>
      </section>

      <section className="shell process-grid">
        <div>
          <FileSearch size={20} />
          <strong>You supply the source</strong>
          <span>Structured details plus the canonical page they came from.</span>
        </div>
        <div>
          <Scale size={20} />
          <strong>Editors check it</strong>
          <span>Rights, accuracy, duplication, and safety before anything publishes.</span>
        </div>
        <div>
          <UsersRound size={20} />
          <strong>It becomes findable</strong>
          <span>The record joins its clinical topics and the wider directory.</span>
        </div>
      </section>

      <section className="shell submission-section">
        <div className="submission-layout">
          <div>
            <PreviewNote title="What happens next">
              Your suggestion is stored and sent to the editors, who check the source and
              reply by email. It is published only once it has been checked.
            </PreviewNote>
            <WorkflowForm mode="submission" />
          </div>
          <aside className="submission-aside">
            <div className="sidebar-card">
              <Building2 size={20} />
              <strong>Representing the organisation?</strong>
              <p>
                If the record already exists and you work there, claim it instead. Claims
                are free and give you control of the official facts.
              </p>
              <Link className="primary-link" href="/for-organizations">
                Claim a record
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="sidebar-card professional-note">
              <strong>What belongs here</strong>
              <p>
                Organisations, solutions, hardware, studies, events, and projects in
                medical XR — with a public source. No patient information.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
