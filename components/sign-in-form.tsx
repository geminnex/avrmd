"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, MailCheck, ShieldAlert } from "lucide-react";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "sent"; message: string; devLink?: string }
  | { status: "error"; message: string };

export function SignInForm({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    const email = new FormData(event.currentTarget).get("email");

    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message: string;
        devLink?: string;
      };

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
    <form className={`workflow-form${compact ? " compact" : ""}`} onSubmit={handleSubmit}>
      <div className="workflow-form-heading">
        <span className="eyebrow">Passwordless</span>
        <h2>Sign in with email</h2>
        <p>AVRMD uses magic links. No password is ever created or stored.</p>
      </div>

      {state.status === "sent" ? (
        <div className="form-message success" role="status">
          <MailCheck size={18} />
          <span>
            <strong>Link on its way</strong>
            {state.message}
            {state.devLink && (
              <small>
                <a href={state.devLink}>{state.devLink}</a>
              </small>
            )}
          </span>
        </div>
      ) : (
        <>
          <label className="form-field" htmlFor="sign-in-email">
            <span>Professional email</span>
            <input id="sign-in-email" name="email" required type="email" />
          </label>

          {state.status === "error" && (
            <div className="form-message error" role="alert">
              <ShieldAlert size={18} />
              <span>
                <strong>Couldn&rsquo;t send that</strong>
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
                Send sign-in link
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </>
      )}
    </form>
  );
}
