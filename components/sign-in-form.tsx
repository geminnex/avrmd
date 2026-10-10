"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, MailCheck, ShieldAlert } from "lucide-react";

type Mode = "signin" | "register" | "forgot";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "sent"; message: string; devLink?: string }
  | { status: "error"; message: string };

const errorMessages: Record<string, string> = {
  expired_link: "That link has expired or was already used.",
  missing_token: "That link is incomplete.",
  invalid_request: "That request didn't come from this site. Try again from here.",
  rate_limited: "Too many attempts from here. Wait a few minutes and try again.",
  google_unavailable: "Google sign-in isn't available right now. Use your email and password.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't complete. Try again, or use your email and password.",
};

const headings: Record<Mode, { title: string; note: string; submit: string }> = {
  signin: { title: "Sign in", note: "Your email is your account.", submit: "Sign in" },
  register: {
    title: "Create your account",
    note: "We'll email you a link to confirm the address. Membership is free.",
    submit: "Create account",
  },
  forgot: {
    title: "Reset your password",
    note: "We'll email you a link to choose a new one.",
    submit: "Email me a reset link",
  },
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
  initialMode = "signin",
}: {
  next?: string;
  googleEnabled?: boolean;
  initialError?: string;
  initialMode?: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [state, setState] = useState<State>(
    initialError && errorMessages[initialError]
      ? { status: "error", message: errorMessages[initialError] }
      : { status: "idle" },
  );

  function switchTo(nextMode: Mode) {
    setMode(nextMode);
    setState({ status: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (mode === "register" && password !== String(form.get("confirm") ?? "")) {
      setState({ status: "error", message: "The two passwords don't match." });
      return;
    }

    setState({ status: "loading" });
    const endpoint = { signin: "/api/auth/login", register: "/api/auth/register", forgot: "/api/auth/forgot" }[mode];
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "forgot" ? { email } : { email, password, next }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; next?: string; devLink?: string };

      if (!response.ok || !result.ok) {
        setState({ status: "error", message: result.message ?? "Something went wrong." });
        return;
      }
      if (mode === "signin") {
        router.push(result.next ?? "/");
        router.refresh();
        return;
      }
      setState({ status: "sent", message: result.message ?? "Check your inbox.", devLink: result.devLink });
    } catch {
      setState({ status: "error", message: "Could not reach the server. Try again." });
    }
  }

  const heading = headings[mode];

  return (
    <div className="workflow-form compact sign-in-panel">
      <div className="sign-in-tabs" role="tablist">
        <button aria-selected={mode !== "register"} onClick={() => switchTo("signin")} role="tab" type="button">
          Sign in
        </button>
        <button aria-selected={mode === "register"} onClick={() => switchTo("register")} role="tab" type="button">
          Create account
        </button>
      </div>

      <div className="workflow-form-heading">
        <h2>{heading.title}</h2>
        <p>{heading.note}</p>
      </div>

      {googleEnabled && mode !== "forgot" && (
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
        <form key={mode} onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="auth-email">
            <span>Email</span>
            <input autoComplete="email" id="auth-email" name="email" required type="email" />
          </label>

          {mode !== "forgot" && (
            <label className="form-field" htmlFor="auth-password">
              <span>Password</span>
              <input
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                id="auth-password"
                maxLength={200}
                minLength={mode === "register" ? 10 : undefined}
                name="password"
                required
                type="password"
              />
            </label>
          )}

          {mode === "register" && (
            <label className="form-field" htmlFor="auth-confirm">
              <span>Confirm password</span>
              <input autoComplete="new-password" id="auth-confirm" maxLength={200} name="confirm" required type="password" />
              <small className="sign-in-fineprint">At least 10 characters. A few unrelated words work well.</small>
            </label>
          )}

          {state.status === "error" && (
            <div className="form-message error" role="alert">
              <ShieldAlert size={18} />
              <span>{state.message}</span>
            </div>
          )}

          <button className="workflow-submit" disabled={state.status === "loading"} type="submit">
            {state.status === "loading" ? <LoaderCircle className="spin" size={17} /> : null}
            {heading.submit}
            {state.status !== "loading" && <ArrowRight size={17} />}
          </button>
          {mode === "register" && (
            <p className="sign-in-legal">
              By creating an account you agree to the <a href="/terms">terms</a> and{" "}
              <a href="/privacy">privacy policy</a>.
            </p>
          )}
        </form>
      )}

      <p className="sign-in-switch">
        {mode === "signin" && (
          <button onClick={() => switchTo("forgot")} type="button">
            Forgot your password?
          </button>
        )}
        {mode === "forgot" && (
          <button onClick={() => switchTo("signin")} type="button">
            Back to sign in
          </button>
        )}
      </p>
    </div>
  );
}
