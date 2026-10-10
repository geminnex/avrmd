"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("The two passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Couldn't set that password.");
        return;
      }
      router.push(result.next ?? "/");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="workflow-form-heading">
        <h2>Choose a new password</h2>
        <p>
          for <strong>{email}</strong>. Every other device will be signed out.
        </p>
      </div>
      <input autoComplete="username" hidden readOnly type="email" value={email} />
      <label className="form-field" htmlFor="reset-password">
        <span>New password</span>
        <input autoComplete="new-password" id="reset-password" maxLength={200} minLength={10} name="password" required type="password" />
      </label>
      <label className="form-field" htmlFor="reset-confirm">
        <span>Confirm new password</span>
        <input autoComplete="new-password" id="reset-confirm" maxLength={200} name="confirm" required type="password" />
        <small className="sign-in-fineprint">At least 10 characters. A few unrelated words work well.</small>
      </label>
      {error && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}
      <button className="workflow-submit" disabled={pending} type="submit">
        {pending && <LoaderCircle className="spin" size={17} />}
        Save and sign in
        {!pending && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
