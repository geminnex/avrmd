import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/guards";
import { facetKindLabels, facets } from "@/lib/facets";
import { professionalRoleLabels, professionalRoles } from "@/lib/member-profile";
import { stages } from "@/lib/stages";
import { topics } from "@/lib/topics";
import { WelcomeForm } from "@/components/welcome-form";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One screen after the first sign-in: enough to route questions and fill the directory. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireUserOrRedirect("/sign-in?next=/welcome");
  const next = safeNextPath((await searchParams).next);

  return (
    <div className="workflow-page">
      <section className="workflow-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell workflow-hero-layout">
          <div>
            <span className="eyebrow light">Welcome to AVRMD</span>
            <h1>What do you work on?</h1>
            <p>
              Thirty seconds, and the right questions find you. Everything here is optional
              and editable later in your profile.
            </p>
          </div>
        </div>
      </section>
      <section className="shell settings-body wide-body">
        <WelcomeForm
          facetOptions={facets.map((facet) => ({ value: facet.name, label: facet.name, group: facetKindLabels[facet.kind] }))}
          next={next}
          roleOptions={professionalRoles.map((role) => ({ value: role, label: professionalRoleLabels[role] }))}
          stageOptions={stages.map((stage) => ({ value: stage.slug, label: stage.name }))}
          topicOptions={topics.map((topic) => ({ value: topic.slug, label: topic.shortName }))}
        />
      </section>
    </div>
  );
}
