import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailX, ShieldAlert } from "lucide-react";
import { emailKindLabels, verifyUnsubscribeToken, type EmailKind } from "@/lib/email-prefs";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ u?: string; k?: string; t?: string; done?: string }> };

/** Opening the link changes nothing; the button does (link scanners can't unsubscribe anyone). */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { u = "", k = "", t = "", done } = await searchParams;
  const valid = isUuid(u) && verifyUnsubscribeToken(u, k, t);

  return (
    <div className="auth-page">
      <section className="auth-card auth-card-single">
        <div className="workflow-form compact sign-in-panel">
          {done && done in emailKindLabels ? (
            <div className="form-message success" role="status">
              <CheckCircle2 size={18} />
              <span>
                <strong>Done — you won&apos;t get these any more</strong>
                {emailKindLabels[done as EmailKind]}. Turn them back on in{" "}
                <Link href="/settings/profile#email">settings</Link>.
              </span>
            </div>
          ) : valid ? (
            <form action={`/api/email/unsubscribe?${new URLSearchParams({ u, k, t })}`} method="POST">
              <div className="workflow-form-heading">
                <span className="eyebrow">Email settings</span>
                <h2>Stop these emails?</h2>
                <p>{emailKindLabels[k as EmailKind]}</p>
              </div>
              <button className="workflow-submit" type="submit">
                <MailX size={17} />
                Unsubscribe
              </button>
            </form>
          ) : (
            <div className="form-message error" role="alert">
              <ShieldAlert size={18} />
              <span>
                <strong>This link isn&apos;t valid</strong>
                Manage your emails in <Link href="/settings/profile#email">settings</Link>.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
