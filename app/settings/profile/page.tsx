import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { EmailPrefsForm } from "@/components/email-prefs-form";
import { emailKindLabels } from "@/lib/email-prefs";
import { readMemberProfile } from "@/lib/db/repositories/users";
import { catalog } from "@/lib/catalog";
import { facetKindLabels, facets } from "@/lib/facets";
import { professionalRoleLabels, professionalRoles } from "@/lib/member-profile";
import { stages } from "@/lib/stages";
import { topics } from "@/lib/topics";

export const metadata: Metadata = { title: "Profile settings" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await requireUserOrRedirect("/sign-in?next=/settings/profile");
  const profile = readMemberProfile(user);

  return (
    <div className="workflow-page">
      <section className="workflow-hero">
        <div className="page-intro-grid" aria-hidden="true" />
        <div className="shell workflow-hero-layout">
          <div>
            <span className="eyebrow light">Your profile</span>
            <h1>How other members see you.</h1>
            <p>Your handle becomes your profile URL: avrmd.cyalin.com/members/your-handle.</p>
          </div>
        </div>
      </section>

      <section className="shell settings-body">
        <ProfileSettingsForm
          facetOptions={facets.map((facet) => ({
            value: facet.name,
            label: facet.name,
            group: facetKindLabels[facet.kind],
          }))}
          initialAffiliationSlug={profile.affiliationSlug ?? ""}
          initialBio={user.bio ?? ""}
          initialCanHelpWith={profile.canHelpWith}
          initialDisplayName={user.displayName ?? ""}
          initialHandle={user.handle ?? ""}
          initialLookingFor={profile.lookingFor}
          initialRoles={profile.roles}
          initialStages={profile.stages}
          initialTopicInterests={profile.topicInterests}
          organizationOptions={catalog
            .filter((entity) => entity.kind === "organization")
            .map((entity) => ({ value: entity.slug, label: entity.name }))
            .sort((a, b) => a.label.localeCompare(b.label))}
          roleOptions={professionalRoles.map((role) => ({
            value: role,
            label: professionalRoleLabels[role],
          }))}
          stageOptions={stages.map((stage) => ({ value: stage.slug, label: stage.name }))}
          topicOptions={topics.map((topic) => ({ value: topic.slug, label: topic.shortName }))}
        />
        <EmailPrefsForm initial={user.emailPrefs} labels={emailKindLabels} />
        <DeleteAccountForm email={user.email} />
      </section>
    </div>
  );
}
