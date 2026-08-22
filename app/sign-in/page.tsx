import type { Metadata } from "next";
import { BadgeCheck, Bookmark, MessagesSquare, Radar } from "lucide-react";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Passwordless member access for AVRMD professionals.",
};

export default function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-orb" aria-hidden="true" />
      <section className="auth-card">
        <div className="auth-copy">
          <span className="eyebrow light">Professional membership</span>
          <h1>An account keeps your research.</h1>
          <p>
            Everything on AVRMD is readable without an account. Signing in adds the things
            that need to remember you.
          </p>
          <div>
            <Bookmark size={18} />
            <span>
              <strong>Save and compare records</strong>
              Keep a shortlist across sessions
            </span>
          </div>
          <div>
            <Radar size={18} />
            <span>
              <strong>Follow a clinical topic</strong>
              Hear when records or evidence change
            </span>
          </div>
          <div>
            <MessagesSquare size={18} />
            <span>
              <strong>Post and message</strong>
              Share updates and message other members
            </span>
          </div>
          <div>
            <BadgeCheck size={18} />
            <span>
              <strong>Claim your organisation</strong>
              Verified with a work-domain email
            </span>
          </div>
        </div>
        <SignInForm compact />
      </section>
    </div>
  );
}
