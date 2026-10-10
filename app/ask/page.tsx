import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { AskForm } from "@/components/ask-form";
import { facetKindLabels, facets } from "@/lib/facets";
import { questionTagLimits } from "@/lib/questions";
import { stages } from "@/lib/stages";
import { topics } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Ask the network",
  description:
    "Ask a question about medical XR and it goes to the members who said they can help with it.",
};

export default function AskPage() {
  return (
    <div className="workflow-page">
      <section className="workflow-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell workflow-hero-layout">
          <div>
            <span className="eyebrow light">
              <MessageCircleQuestion size={15} />
              Ask the network
            </span>
            <h1>Stuck? Ask someone who has been there.</h1>
            <p>
              Tag your question and it goes straight to the members who said they can help
              with that. Everyone else can find it under <Link href="/questions">Questions</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="shell settings-body wide-body">
        <Suspense fallback={null}>
          <AskForm
            facetOptions={facets.map((facet) => ({
              value: facet.name,
              label: facet.name,
              group: facetKindLabels[facet.kind],
            }))}
            limits={questionTagLimits}
            stageOptions={stages.map((stage) => ({ value: stage.slug, label: stage.name }))}
            topicOptions={topics.map((topic) => ({ value: topic.slug, label: topic.shortName }))}
          />
        </Suspense>
      </section>
    </div>
  );
}
