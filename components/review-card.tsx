"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, LoaderCircle, RotateCcw, Send, ShieldAlert, X } from "lucide-react";
import { TagPicker, type TagOption } from "./tag-picker";
import type { ReviewFields } from "@/lib/review";

type Vocab = {
  kinds: string[];
  specialties: TagOption[];
  useCases: TagOption[];
  modalities: TagOption[];
  stages: TagOption[];
};

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok && payload.ok, payload };
}

/** One candidate: what the AI thought, the draft to correct, and the decision. */
export function ReviewCard({
  id,
  title,
  sourceUrl,
  sourceLabel,
  published,
  reason,
  confidence,
  initial,
  vocab,
}: {
  id: string;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  published: string | null;
  reason?: string;
  confidence?: number;
  initial: ReviewFields;
  vocab: Vocab;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof ReviewFields>(key: K, value: ReviewFields[K]) => setFields((current) => ({ ...current, [key]: value }));

  async function decide(action: "approve" | "reject") {
    setPending(action);
    setError(null);
    const result = await post(`/api/workspace/candidates/${id}`, action === "approve" ? { action, fields } : { action });
    setPending(null);
    if (!result.ok) {
      setError(result.payload.message ?? "Couldn't save that.");
      return;
    }
    setDone(action === "approve" ? `Approved as /entities/${result.payload.slug} — published with the next deploy.` : "Rejected.");
    router.refresh();
  }

  if (done) {
    return (
      <article className="review-card done">
        <Check size={16} />
        <span>
          <strong>{fields.name}</strong> — {done}
        </span>
      </article>
    );
  }

  return (
    <article className="review-card">
      <header>
        <a href={sourceUrl} rel="noopener" target="_blank">
          {title}
          <ArrowUpRight size={14} />
        </a>
        <small>
          {sourceLabel}
          {published ? ` · ${published}` : ""}
          {typeof confidence === "number" ? ` · AI ${Math.round(confidence * 100)}%` : " · no AI draft"}
        </small>
        {reason && <p className="review-reason">AI: {reason}</p>}
      </header>

      <div className="review-grid">
        <label className="form-field">
          <span>Record name</span>
          <input onChange={(event) => set("name", event.target.value)} value={fields.name} />
        </label>
        <label className="form-field">
          <span>Kind</span>
          <select onChange={(event) => set("kind", event.target.value as ReviewFields["kind"])} value={fields.kind}>
            {vocab.kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Type label</span>
          <input onChange={(event) => set("typeLabel", event.target.value)} value={fields.typeLabel} />
        </label>
        <label className="form-field">
          <span>Maturity</span>
          <input onChange={(event) => set("maturity", event.target.value)} value={fields.maturity} />
        </label>
      </div>
      <label className="form-field">
        <span>Summary (our words, from the source&apos;s metadata)</span>
        <textarea onChange={(event) => set("summary", event.target.value)} rows={3} value={fields.summary} />
      </label>
      <div className="review-tags">
        <TagPicker label="Specialties" max={4} onChange={(value) => set("specialties", value)} options={vocab.specialties} selected={fields.specialties} />
        <TagPicker label="Use cases" max={4} onChange={(value) => set("useCases", value)} options={vocab.useCases} selected={fields.useCases} />
        <TagPicker label="Modalities" max={3} onChange={(value) => set("modalities", value)} options={vocab.modalities} selected={fields.modalities} />
        <TagPicker label="Stages" max={3} onChange={(value) => set("stages", value)} options={vocab.stages} selected={fields.stages} />
      </div>

      {error && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}
      <footer>
        <button className="button-primary" disabled={pending !== null} onClick={() => decide("approve")} type="button">
          {pending === "approve" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
          Approve
        </button>
        <button className="button-secondary" disabled={pending !== null} onClick={() => decide("reject")} type="button">
          {pending === "reject" ? <LoaderCircle className="spin" size={15} /> : <X size={15} />}
          Reject
        </button>
      </footer>
    </article>
  );
}

export function RestoreButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="review-mini"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await post(`/api/workspace/candidates/${id}`, { action: "restore" });
        router.refresh();
      }}
      type="button"
    >
      <RotateCcw size={13} />
      Restore
    </button>
  );
}

export function ContributionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const setStatus = async (next: string) => {
    setPending(true);
    await post(`/api/workspace/contributions/${id}`, { status: next });
    router.refresh();
  };
  return (
    <span className="review-actions">
      {status !== "approved" && (
        <button className="review-mini" disabled={pending} onClick={() => setStatus("approved")} type="button">
          <Check size={13} />
          Done
        </button>
      )}
      {status !== "rejected" && (
        <button className="review-mini" disabled={pending} onClick={() => setStatus("rejected")} type="button">
          <X size={13} />
          Decline
        </button>
      )}
    </span>
  );
}

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const act = async (action: "hide" | "dismiss") => {
    setPending(true);
    await post(`/api/workspace/reports/${id}`, { action });
    router.refresh();
  };
  return (
    <span className="review-actions">
      <button className="review-mini" disabled={pending} onClick={() => act("hide")} type="button">
        <X size={13} />
        Hide content
      </button>
      <button className="review-mini" disabled={pending} onClick={() => act("dismiss")} type="button">
        <Check size={13} />
        Dismiss
      </button>
    </span>
  );
}

/** Editors invite people by email, with a personal note. */
export function InviteForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setMessage(null);
    const result = await post("/api/workspace/invitations", {
      email: String(form.get("email") ?? ""),
      name: String(form.get("name") ?? ""),
      note: String(form.get("note") ?? ""),
    });
    setPending(false);
    setMessage({ ok: result.ok, text: result.payload.message ?? (result.ok ? "Sent." : "Couldn't send that.") });
    if (result.ok) {
      formElement.reset();
      router.refresh();
    }
  }

  return (
    <form className="review-card invite-form" onSubmit={submit}>
      <div className="review-grid invite-grid">
        <label className="form-field">
          <span>Email</span>
          <input maxLength={254} name="email" required type="email" />
        </label>
        <label className="form-field">
          <span>Name (optional)</span>
          <input maxLength={120} name="name" placeholder="Dr. Jane Smith" />
        </label>
      </div>
      <label className="form-field">
        <span>Personal note (optional, shown at the top of the email and on the join page)</span>
        <textarea maxLength={1500} name="note" placeholder="I saw your work on VR for burn wound care and think members would value your answers." rows={3} />
      </label>
      {message && (
        <div className={`form-message ${message.ok ? "success" : "error"}`} role={message.ok ? "status" : "alert"}>
          {message.ok ? <Check size={16} /> : <ShieldAlert size={16} />}
          <span>{message.text}</span>
        </div>
      )}
      <footer>
        <button className="button-primary" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}
          Send invitation
        </button>
      </footer>
    </form>
  );
}
