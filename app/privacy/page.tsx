import type { Metadata } from "next";
import Link from "next/link";
import { contactEmail } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What AVRMD collects, why, who else sees it, and how to delete it.",
};

// Reads the contact address from the server's configuration.
export const dynamic = "force-dynamic";

const updated = "2026-10-10";

export default function PrivacyPage() {
  const contact = contactEmail();
  return (
    <div className="shell legal-page">
      <h1>Privacy</h1>
      <p className="legal-updated">Last updated {updated}</p>

      <p>
        AVRMD is a professional network for medical virtual, augmented and mixed reality.
        This page describes what the site actually does with your information. You can read
        everything on AVRMD without an account; nothing below applies until you sign up,
        post, or use the assistant.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your email address, which is your account
          identifier, and a password hash (scrypt). We never store the password itself. If
          you sign in with Google, we receive your Google account id, email and name.
        </li>
        <li>
          <strong>What you choose to add.</strong> Profile details (display name, handle,
          bio, roles, stages, what you can help with, interests, affiliation), questions,
          answers, posts, comments, likes, follows, talks you submit, images you upload, and
          messages you send through forms.
        </li>
        <li>
          <strong>One cookie to keep you signed in.</strong> It is strictly necessary,
          lasts 30 days or until you sign out, and is not readable by scripts. Signing in
          with Google sets a second cookie for up to 10 minutes to complete that step.
        </li>
      </ul>
      <p>
        We do not use analytics, advertising trackers or third-party cookies. Do not post
        patient information or personal health information anywhere on AVRMD; the terms
        prohibit it.
      </p>

      <h2>What is public</h2>
      <p>
        Your handle, display name, bio and the profile fields you fill in are public, as is
        anything you post, ask or answer. Your email address is never shown on the site. A
        new account starts with a neutral handle (for example member-3f9a2c) until you
        choose one.
      </p>

      <h2>Who else processes it</h2>
      <ul>
        <li>
          <strong>Email delivery:</strong> Purelymail sends confirmation, password-reset and
          notification emails.
        </li>
        <li>
          <strong>Ask AVRMD:</strong> the text of a question you ask the assistant, with the
          AVRMD content that matches it, is sent through OpenRouter to the model that writes
          the answer (currently Anthropic&rsquo;s Claude), routed only to providers that
          do not retain or train on requests. We do not store your question; we record
          which model answered, token counts and timing. Nothing about other members is
          sent beyond a count of people who offered help.
        </li>
        <li>
          <strong>Google,</strong> only if you choose to sign in with it.
        </li>
      </ul>
      <p>We do not sell or rent personal information, and we do not share it for advertising.</p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete your account. Deletion removes your account and everything listed
        above at once, including uploaded images. Nightly backups are kept for 14 days and
        then overwritten, so deleted data leaves the backups within two weeks. Your IP
        address is used briefly to limit repeated requests and is not stored by the
        application.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          Change or remove profile details in <Link href="/settings/profile">settings</Link>.
        </li>
        <li>
          Delete your account at the bottom of the same page.
        </li>
        <li>
          For a copy of your data, or any question about this page, email{" "}
          <a href={`mailto:${contact}`}>{contact}</a>.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        If this page changes in a way that affects what we do with your information, we will
        say so on the site before it takes effect.
      </p>
    </div>
  );
}
