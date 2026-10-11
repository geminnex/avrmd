import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, LifeBuoy, MessageCircleQuestion, ShieldAlert } from "lucide-react";
import { JoinForm } from "@/components/join-form";
import { googleConfig } from "@/lib/auth/google";
import { peekInvitation } from "@/lib/db/repositories/invitations";
import { getUserByEmail } from "@/lib/db/repositories/users";

export const metadata: Metadata = { title: "Join AVRMD", robots: { index: false } };
export const dynamic = "force-dynamic";

type JoinPageProps = { searchParams: Promise<{ token?: string }> };

/** Where an invitation link lands. Opening it changes nothing; the form does. */
export default async function JoinPage({ searchParams }: JoinPageProps) {
  const token = (await searchParams).token ?? "";
  let invitation: Awaited<ReturnType<typeof peekInvitation>> | undefined;
  let member = false;
  try {
    invitation = token ? await peekInvitation(token) : undefined;
    member = Boolean(invitation && (await getUserByEmail(invitation.email))?.emailVerifiedAt);
  } catch {
    invitation = undefined;
  }
  const inviter = invitation?.inviterName || "An AVRMD editor";

  return (
    <div className="auth-page">
      <div className="auth-orb" aria-hidden="true" />
      <section className={invitation && !member ? "auth-card" : "auth-card auth-card-single"}>
        {invitation && !member && (
          <div className="auth-copy">
            <span className="eyebrow light">Invitation</span>
            <h1>{invitation.name ? `${invitation.name}, you're invited.` : "You're invited."}</h1>
            <p>
              {inviter} invited you to AVRMD, the community for virtual and augmented reality in
              medicine. Membership is free.
            </p>
            {invitation.note && <blockquote className="join-note">{invitation.note}</blockquote>}
            <div>
              <MessageCircleQuestion size={18} />
              <span>
                <strong>Questions in your field</strong>
                Members ask; you hear about the ones you said you can help with
              </span>
            </div>
            <div>
              <Bell size={18} />
              <span>
                <strong>A weekly digest</strong>
                New FDA clearances, papers and trials that match your work
              </span>
            </div>
            <div>
              <LifeBuoy size={18} />
              <span>
                <strong>Be findable</strong>
                By the clinicians, engineers and companies who need your expertise
              </span>
            </div>
          </div>
        )}
        {invitation && !member ? (
          <JoinForm email={invitation.email} googleEnabled={googleConfig() !== null} token={token} />
        ) : (
          <div className="workflow-form compact sign-in-panel">
            <div className="form-message error" role="alert">
              <ShieldAlert size={18} />
              <span>
                <strong>{member ? "You're already a member" : "This invitation can't be used"}</strong>
                {member
                  ? `${invitation?.email} already has an account. Sign in to continue.`
                  : "It has expired or was already used. You can still create an account; membership is free."}
              </span>
            </div>
            <Link className="workflow-submit" href={member ? "/sign-in" : "/sign-in?mode=register"}>
              {member ? "Go to sign in" : "Create an account"}
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
