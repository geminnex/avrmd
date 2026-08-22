import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { ProfileSettingsForm } from "@/components/profile-settings-form";

export const metadata: Metadata = { title: "Profile settings" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await requireUserOrRedirect("/sign-in?next=/settings/profile");

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
          initialBio={user.bio ?? ""}
          initialDisplayName={user.displayName ?? ""}
          initialHandle={user.handle ?? ""}
        />
      </section>
    </div>
  );
}
