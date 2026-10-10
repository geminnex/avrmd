"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, MailCheck, ShieldAlert } from "lucide-react";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "sent"; message: string; devLink?: string }
  | { status: "error"; message: string };

const errorMessages: Record<string, string> = {
  expired_link: "That sign-in link has expired or was already used. Ask for a new one.",
  missing_token: "That sign-in link is incomplete. Ask for a new one.",
  invalid_request: "That request didn't come from this site. Try again from here.",
  google_unavailable: "Google sign-in isn't available right now. Use your email instead.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't complete. Try again, or use your email.",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 48 48" width="18">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107" />
      <path d="M6.3 14.7l7 5.1C15.2 15.1 19.3 12 24 12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.6 2 8.4 6.8 6.3 14.7z" fill="#FF3D00" />
      <path d="M24 46c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 36.9 27 38 24 38c-6 0-10.6-3.1-11.7-8.4l-7 5.4C7.4 41.1 15.1 46 24 46z" fill="#4CAF50" />
      <path d="M44.5 20H24v8.5h11.8c-.6 2.8-2.2 5.2-4.3 6.9l6.5 5.5C42.1 37.2 45 31.2 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2" />
    </svg>
  );
}

export function SignInForm({
  next = "/",
  googleEnabled = false,
  initialError,
}: {
  next?: string;
  googleEnabled?: boolean;
  initialError?: string;
}) {
  const [state, setState] = useState<State>(
    initialError && errorMessages[initialError]
      ? { status: "error", message: errorMessages[initialError] }
      : { status: "idle" },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    const email = new FormData(event.currentTarget).get("email");

    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const result = (await response.json()) as { ok: boolean; message: string; devLink?: string };

      if (!response.ok || !result.ok) {
        setState({ status: "error", message: result.message ?? "Something went wrong." });
        return;
      }

      setState({ status: "sent", message: result.message, devLink: result.devLink });
    } catch {
      setState({ status: "error", message: "Could not reach the server. Try again." });
    }
  }

  return (
    <div className="workflow-form compact sign-in-panel">
      <div className="workflow-form-heading">
        <span className="eyebrow">No password</span>
        <h2>Sign in or create an account</h2>
        <p>The same step does both. AVRMD never creates or stores a password.</p>
      </div>

      {googleEnabled && (
        <>
          <a className="google-button" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
            <GoogleMark />
            Continue with Google
          </a>
          <div className="sign-in-divider">
            <span>or with email</span>
          </div>
        </>
      )}

      {state.status === "sent" ? (
        <div className="form-message success" role="status">
          <MailCheck size={18} />
          <span>
            <strong>Check your inbox</strong>
            {state.message}
            {state.devLink && (
              <small>
                <a href={state.devLink}>{state.devLink}</a>
              </small>
            )}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="sign-in-email">
            <span>Email</span>
            <input autoComplete="email" id="sign-in-email" name="email" required type="email" />
          </label>

          {state.status === "error" && (
            <div className="form-message error" role="alert">
              <ShieldAlert size={18} />
              <span>
                <strong>Not signed in</strong>
                {state.message}
              </span>
            </div>
          )}

          <button className="workflow-submit" disabled={state.status === "loading"} type="submit">
            {state.status === "loading" ? (
              <>
                <LoaderCircle className="spin" size={17} />
                Sending
              </>
            ) : (
              <>
                Email me a sign-in link
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
