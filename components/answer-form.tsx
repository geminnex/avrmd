"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageSquareReply, ShieldAlert } from "lucide-react";

export function AnswerForm({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (response.status === 401) {
        router.push(`/sign-in?next=/questions/${questionId}`);
        return;
      }

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Couldn't post that answer.");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="talk-submit-form answer-form" onSubmit={handleSubmit}>
      <h3>Your answer</h3>
      <p className="talk-submit-note">
        Say what you did and what happened. Experience is the thing nobody can look up.
      </p>
      <textarea
        aria-label="Your answer"
        maxLength={5000}
        minLength={10}
        onChange={(event) => setBody(event.target.value)}
        required
        rows={6}
        value={body}
      />

      {error && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="talk-submit-actions">
        <button className="button-primary" disabled={submitting} type="submit">
          {submitting ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <MessageSquareReply size={16} />
          )}
          {submitting ? "Posting…" : "Post answer"}
        </button>
      </div>
    </form>
  );
}
