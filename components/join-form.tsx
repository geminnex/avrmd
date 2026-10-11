"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react";
import { GoogleMark } from "./sign-in-form";

/** Accepting an invitation: the link already proved the address, so a password is all it takes. */
export function JoinForm({ token, email, googleEnabled }: { token: string; email: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<{ message: string; signIn?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError({ message: "The two passwords don't match." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; next?: string; signIn?: boolean };
      if (!response.ok || !result.ok) {
        setError({ message: result.message ?? "Something went wrong.", signIn: result.signIn });
        setLoading(false);
        return;
      }
      router.push(result.next ?? "/");
      router.refresh();
    } catch {
      setError({ message: "Could not reach the server. Try again." });
      setLoading(false);
    }
  }

  return (
    <div className="workflow-form compact sign-in-panel">
      <div className="workflow-form-heading">
        <h2>Create your account</h2>
        <p>
          as <strong>{email}</strong>
        </p>
      </div>

      {googleEnabled && (
        <>
          <a className="google-button" href="/api/auth/google?next=%2F">
            <GoogleMark />
            Continue with Google
          </a>
          <div className="sign-in-divider">
            <span>or choose a password</span>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <input autoComplete="username" name="email" type="hidden" value={email} />
        <label className="form-field" htmlFor="join-password">
          <span>Password</span>
          <input autoComplete="new-password" id="join-password" maxLength={200} minLength={10} name="password" required type="password" />
        </label>
        <label className="form-field" htmlFor="join-confirm">
          <span>Confirm password</span>
          <input autoComplete="new-password" id="join-confirm" maxLength={200} name="confirm" required type="password" />
          <small className="sign-in-fineprint">At least 10 characters. A few unrelated words work well.</small>
        </label>

        {error && (
          <div className="form-message error" role="alert">
            <ShieldAlert size={18} />
            <span>
              {error.message}
              {error.signIn && (
                <>
                  {" "}
                  <a href="/sign-in">Go to sign in</a>
                </>
              )}
            </span>
          </div>
        )}

        <button className="workflow-submit" disabled={loading} type="submit">
          {loading ? <LoaderCircle className="spin" size={17} /> : null}
          Join AVRMD
          {!loading && <ArrowRight size={17} />}
        </button>
        <p className="sign-in-legal">
          By creating an account you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.
        </p>
      </form>
    </div>
  );
}
