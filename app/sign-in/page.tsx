import type { Metadata } from "next";
import { Bell, LifeBuoy, MessageCircleQuestion, Mic } from "lucide-react";
import { SignInForm } from "@/components/sign-in-form";
import { googleConfig } from "@/lib/auth/google";
import { safeNextPath } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to AVRMD with Google or an email link. No password.",
};

// Reads ?next= and ?error=, and whether Google is configured on this server.
export const dynamic = "force-dynamic";

type SignInPageProps = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <div className="auth-page">
      <div className="auth-orb" aria-hidden="true" />
      <section className="auth-card">
        <div className="auth-copy">
          <span className="eyebrow light">Membership is free</span>
          <h1>Get help from people who have done it.</h1>
          <p>
            Everything on AVRMD is readable without an account. An account is for taking
            part.
          </p>
          <div>
            <MessageCircleQuestion size={18} />
            <span>
              <strong>Ask a question</strong>
              It goes to the members who said they can help with that topic
            </span>
          </div>
          <div>
            <LifeBuoy size={18} />
            <span>
              <strong>Say what you can help with</strong>
              Be findable in the member directory, by role and stage
            </span>
          </div>
          <div>
            <Bell size={18} />
            <span>
              <strong>Get notified</strong>
              When someone answers you, or asks something you know
            </span>
          </div>
          <div>
            <Mic size={18} />
            <span>
              <strong>Share your work</strong>
              Add your talks and post updates
            </span>
          </div>
        </div>
        <SignInForm
          googleEnabled={Boolean(googleConfig())}
          initialError={params.error}
          next={safeNextPath(params.next)}
        />
      </section>
    </div>
  );
}
