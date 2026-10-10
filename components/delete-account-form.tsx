"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";

export function DeleteAccountForm({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmEmail: new FormData(event.currentTarget).get("confirmEmail") }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Couldn't delete the account.");
        return;
      }
      window.location.assign("/?deleted=1");
    } catch {
      setError("Could not reach the server. Nothing was deleted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="danger-zone">
      <h2>Delete your account</h2>
      <p>
        Removes your profile, questions, answers, posts, comments, uploaded images, talks you
        added and everything you sent through forms. It can&apos;t be undone.
      </p>
      {!open ? (
        <button className="button-secondary" onClick={() => setOpen(true)} type="button">
          <Trash2 size={16} />
          Delete my account
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="confirm-email">
            <span>Type {email} to confirm</span>
            <input autoComplete="off" id="confirm-email" name="confirmEmail" required type="email" />
          </label>
          {error && (
            <div className="form-message error" role="alert">
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}
          <div className="danger-actions">
            <button className="danger-button" disabled={pending} type="submit">
              {pending ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
              Delete permanently
            </button>
            <button className="button-secondary" onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
