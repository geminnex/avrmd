import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { peekVerificationToken } from "@/lib/db/repositories/verification-tokens";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };
export const dynamic = "force-dynamic";

type ResetPageProps = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: ResetPageProps) {
  const { token = "" } = await searchParams;
  let email: string | undefined;
  try {
    const row = token ? await peekVerificationToken(token) : undefined;
    email = row?.purpose === "reset_password" ? row.email : undefined;
  } catch {
    email = undefined;
  }

  return (
    <div className="auth-page">
      <div className="auth-orb" aria-hidden="true" />
      <section className="auth-card auth-card-single">
        <div className="workflow-form compact sign-in-panel">
          {email ? (
            <ResetPasswordForm email={email} token={token} />
          ) : (
            <>
              <div className="form-message error" role="alert">
                <ShieldAlert size={18} />
                <span>
                  <strong>This link can&apos;t be used</strong>
                  Reset links work once, for 30 minutes. Ask for a new one.
                </span>
              </div>
              <Link className="workflow-submit" href="/sign-in?mode=forgot">
                Get a new link
                <ArrowRight size={17} />
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
