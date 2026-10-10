"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";

/** Rendered only for the asker; the route checks that again. */
export function AcceptAnswerButton({
  questionId,
  answerId,
}: {
  questionId: string;
  answerId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions/${questionId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Couldn't mark that answer.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="accept-answer">
      <button className="button-secondary" disabled={pending} onClick={accept} type="button">
        {pending ? <LoaderCircle className="spin" size={15} /> : <CheckCircle2 size={15} />}
        This helped
      </button>
      {error && <small role="alert">{error}</small>}
    </span>
  );
}
