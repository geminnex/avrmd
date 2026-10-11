"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  member: "Member",
  editor: "Editor",
  moderator: "Moderator",
  administrator: "Administrator",
};

/** The controls on one row of the member list; the server re-checks every rule. */
export function MemberActions({
  id,
  email,
  role,
  suspended,
  canChangeRole,
  canSuspend,
  redirectAfterDelete,
}: {
  id: string;
  email: string;
  role: string;
  suspended: boolean;
  canChangeRole: boolean;
  canSuspend: boolean;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  async function act(body: Record<string, string>) {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/workspace/members/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    setMessage({ ok: response.ok && payload.ok, text: payload.message ?? "Couldn't save that." });
    if (response.ok && payload.ok) {
      setConfirming(false);
      if (body.action === "delete" && redirectAfterDelete) {
        router.push(redirectAfterDelete);
        return;
      }
      router.refresh();
    }
  }

  return (
    <div className="member-actions">
      <div className="review-actions">
        {canChangeRole && (
          <select
            aria-label={`Role for ${email}`}
            className="member-role-select"
            disabled={pending}
            onChange={(event) => act({ action: "role", role: event.target.value })}
            value={role in roleLabels ? role : "member"}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {canSuspend && (
          <button className="review-mini" disabled={pending} onClick={() => act({ action: suspended ? "restore" : "suspend" })} type="button">
            {suspended ? <RotateCcw size={13} /> : <Ban size={13} />}
            {suspended ? "Restore" : "Suspend"}
          </button>
        )}
        {canChangeRole && !confirming && (
          <button className="review-mini danger" disabled={pending} onClick={() => setConfirming(true)} type="button">
            <Trash2 size={13} />
            Delete
          </button>
        )}
        {pending && <LoaderCircle className="spin" size={15} />}
      </div>
      {confirming && (
        <form
          className="member-delete"
          onSubmit={(event) => {
            event.preventDefault();
            act({ action: "delete", confirmEmail: typed });
          }}
        >
          <span>Deletes the account, profile, posts, questions and answers. Type the email to confirm.</span>
          <input aria-label="Email to confirm" onChange={(event) => setTyped(event.target.value)} placeholder={email} value={typed} />
          <button className="review-mini danger" disabled={pending || typed.trim().toLowerCase() !== email} type="submit">
            Delete for good
          </button>
          <button className="review-mini" onClick={() => setConfirming(false)} type="button">
            Cancel
          </button>
        </form>
      )}
      {message && <small className={message.ok ? "member-note ok" : "member-note error"}>{message.text}</small>}
    </div>
  );
}
