import type { Metadata } from "next";
import Link from "next/link";
import { contactEmail } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using AVRMD, contributing to it, and reporting copyright problems.",
};

export const dynamic = "force-dynamic";

const updated = "2026-10-10";

export default function TermsPage() {
  const contact = contactEmail();
  return (
    <div className="shell legal-page">
      <h1>Terms of use</h1>
      <p className="legal-updated">Last updated {updated}</p>

      <h2>Professional information, not medical advice</h2>
      <p>
        AVRMD is for professionals working on medical XR. Nothing on it, including answers
        from Ask AVRMD, is medical advice, a diagnosis or a treatment recommendation, and it
        is not a substitute for professional judgement. Regulatory information (such as FDA
        authorizations) is shown as published by the source, with its date; an
        authorization is not evidence of clinical effectiveness. Records, labels and
        sponsored placements are never endorsements.
      </p>

      <h2>No patient information</h2>
      <p>
        Do not post, upload or send patient records, personal health information, or
        anything that could identify a patient. We remove it when we find it.
      </p>

      <h2>Your account</h2>
      <p>
        One account per person, using an email address you control. Keep your password to
        yourself. You are responsible for what is done with your account.
      </p>

      <h2>What you contribute</h2>
      <p>
        You keep ownership of what you post. By posting, you allow AVRMD to display, store
        and distribute it on the site and in its emails. Post only what you have the right
        to share, describe products and evidence accurately, and disclose when you are
        promoting your own organization. No harassment, spam, impersonation or unlawful
        content. We may remove content or suspend accounts that break these terms.
      </p>

      <h2>Ask AVRMD</h2>
      <p>
        The assistant writes short answers from sources on this site and links to them. It
        can be wrong or incomplete; check the sources before relying on an answer.
      </p>

      <h2>Links and third-party content</h2>
      <p>
        AVRMD links to papers, trials, regulatory records, talks and websites run by others.
        We describe them in our own words and link to the source; we are not responsible
        for their content.
      </p>

      <h2 id="copyright">Copyright complaints</h2>
      <p>
        If you believe something on AVRMD infringes your copyright, email{" "}
        <a href={`mailto:${contact}`}>{contact}</a> with: the work you believe is infringed;
        the page or item on AVRMD; your contact details; a statement that you believe in
        good faith the use is not authorized; and a statement that your notice is accurate
        and that you are the owner or authorized to act for the owner. We remove or disable
        the item while we look into it and tell the person who posted it, who may send a
        counter-notice to the same address. Accounts that repeatedly infringe are closed.
      </p>

      <h2>The service</h2>
      <p>
        AVRMD is provided as it is. We work to keep it accurate and available, but cannot
        guarantee either, and to the extent the law allows we are not liable for losses
        from using it. We may change these terms; significant changes are announced on the
        site before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${contact}`}>{contact}</a>. See also our{" "}
        <Link href="/privacy">privacy page</Link>.
      </p>
    </div>
  );
}
