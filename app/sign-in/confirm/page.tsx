import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { safeNextPath } from "@/lib/auth/guards";
import { peekVerificationToken } from "@/lib/db/repositories/verification-tokens";

export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false } };
export const dynamic = "force-dynamic";

type ConfirmPageProps = { searchParams: Promise<{ token?: string; next?: string }> };

/**
 * Opening the emailed link lands here and changes nothing. Signing in takes
 * the button below, a same-site POST, so a mail scanner that prefetches the
 * link can't use it up and another site can't sign you into its account.
 */
export default async function ConfirmSignInPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  let email: string | undefined;
  let purpose: string | undefined;
  try {
    const row = token ? await peekVerificationToken(token) : undefined;
    // Reset links have their own page.
    if (row && row.purpose !== "reset_password") {
      email = row.email;
      purpose = row.purpose;
    }
  } catch {
    email = undefined;
  }

  return (
    <div className="auth-page">
      <div className="auth-orb" aria-hidden="true" />
      <section className="auth-card auth-card-single">
        <div className="workflow-form compact sign-in-panel">
          {email ? (
            <form action="/api/auth/verify" method="POST">
              <div className="workflow-form-heading">
                <span className="eyebrow">One more step</span>
                <h2>{purpose === "verify_email" ? "Confirm your email" : "Sign in to AVRMD"}</h2>
                <p>
                  as <strong>{email}</strong>
                </p>
              </div>
              <input name="token" type="hidden" value={token} />
              <input name="next" type="hidden" value={safeNextPath(params.next)} />
              <button className="workflow-submit" type="submit">
                Continue
                <ArrowRight size={17} />
              </button>
              <p className="sign-in-fineprint">
                Didn&apos;t ask for this? Close the page; nothing happens without the button.
              </p>
            </form>
          ) : (
            <>
              <div className="form-message error" role="alert">
                <ShieldAlert size={18} />
                <span>
                  <strong>This link can&apos;t be used</strong>
                  It has expired or was already used. Sign in, or create your account again to get a new one.
                </span>
              </div>
              <Link className="workflow-submit" href="/sign-in">
                Go to sign in
                <ArrowRight size={17} />
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
