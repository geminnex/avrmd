"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Play, RotateCcw, Send, ShieldAlert, X } from "lucide-react";

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok && payload.ok !== false, payload };
}

function Message({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <div className={`form-message ${message.ok ? "success" : "error"}`} role={message.ok ? "status" : "alert"}>
      {message.ok ? <Check size={16} /> : <ShieldAlert size={16} />}
      <span>{message.text}</span>
    </div>
  );
}

/** Administrator switches on one agent card. */
export function AgentSettingsControls({
  agentId,
  enabled,
  autoAssign,
  dailyLimit,
  hasRoutine,
}: {
  agentId: string;
  enabled: boolean;
  autoAssign: boolean;
  dailyLimit: number;
  hasRoutine: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [limit, setLimit] = useState(String(dailyLimit));
  const save = async (fields: Record<string, unknown>) => {
    setPending(true);
    await post("/api/workspace/agents/settings", { agentId, ...fields });
    setPending(false);
    router.refresh();
  };
  return (
    <div className="agent-settings">
      <label>
        <input checked={enabled} disabled={pending} onChange={(event) => save({ enabled: event.target.checked })} type="checkbox" />
        On
      </label>
      {hasRoutine && (
        <label title="Let the scheduled worker assign its routine tasks">
          <input checked={autoAssign} disabled={pending || !enabled} onChange={(event) => save({ autoAssign: event.target.checked })} type="checkbox" />
          Auto-assign
        </label>
      )}
      <label>
        Daily limit
        <input
          disabled={pending}
          max={200}
          min={0}
          onBlur={() => Number(limit) !== dailyLimit && save({ dailyLimit: Math.max(0, Math.min(200, Number(limit) || 0)) })}
          onChange={(event) => setLimit(event.target.value)}
          type="number"
          value={limit}
        />
      </label>
    </div>
  );
}

type Option = { value: string; label: string };

/** Assign a task: pick an agent, then what it should work on. */
export function AssignTaskForm({
  agents,
  questions,
  reports,
  initialAgent,
}: {
  agents: { id: string; name: string; role: string; kind: string; enabled: boolean }[];
  questions: Option[];
  reports: Option[];
  initialAgent?: string;
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(initialAgent && agents.some((agent) => agent.id === initialAgent) ? initialAgent : agents[0]?.id);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const agent = agents.find((candidate) => candidate.id === agentId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    setMessage(null);
    const result = await post("/api/workspace/agents/tasks", { ...data, agentId });
    setPending(false);
    setMessage({ ok: result.ok, text: result.payload.message ?? (result.ok ? "Assigned." : "Couldn't assign that.") });
    if (result.ok) {
      form.reset();
      router.refresh();
    }
  }

  return (
    <form className="review-card agent-assign" onSubmit={submit}>
      <label className="form-field">
        <span>Agent</span>
        <select onChange={(event) => setAgentId(event.target.value)} value={agentId}>
          {agents.map((candidate) => (
            <option disabled={!candidate.enabled} key={candidate.id} value={candidate.id}>
              {candidate.name} · {candidate.role}
              {candidate.enabled ? "" : " (off)"}
            </option>
          ))}
        </select>
      </label>
      {agent?.kind === "draft_answer" && (
        <label className="form-field">
          <span>Question to answer</span>
          <select name="questionId" required>
            <option value="">Choose a question…</option>
            {questions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {agent?.kind === "assess_report" && (
        <label className="form-field">
          <span>Report to assess</span>
          <select name="reportId" required>
            <option value="">{reports.length ? "Choose a report…" : "No open reports"}</option>
            {reports.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {agent?.kind === "draft_invitation" && (
        <div className="review-grid invite-grid">
          <label className="form-field">
            <span>Invitee email</span>
            <input maxLength={254} name="email" required type="email" />
          </label>
          <label className="form-field">
            <span>Name</span>
            <input maxLength={120} name="name" placeholder="Dr. Jane Smith" />
          </label>
          <label className="form-field invite-about">
            <span>Their field and work</span>
            <textarea maxLength={1000} name="about" placeholder="Orthopaedic surgeon; runs VR surgical training at a teaching hospital." rows={2} />
          </label>
        </div>
      )}
      {agent?.kind === "research_brief" && (
        <label className="form-field">
          <span>Topic</span>
          <input maxLength={300} name="topic" placeholder="VR for chronic pain: products, FDA status, evidence" required />
        </label>
      )}
      <label className="form-field">
        <span>Instructions (optional)</span>
        <textarea maxLength={1000} name="instructions" placeholder="Anything it should focus on or avoid." rows={2} />
      </label>
      <Message message={message} />
      <footer>
        <button className="button-primary" disabled={pending || !agent?.enabled} type="submit">
          {pending ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />}
          Assign
        </button>
      </footer>
    </form>
  );
}

export function RunRoutinesButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="agent-run">
      <button
        className="review-mini"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await post("/api/workspace/agents/run", {});
          setPending(false);
          setMessage(result.payload.message ?? null);
          router.refresh();
        }}
        type="button"
      >
        {pending ? <LoaderCircle className="spin" size={13} /> : <Play size={13} />}
        Run routines now
      </button>
      {message && <small className="member-note">{message}</small>}
    </span>
  );
}

/** Reviewing one task's draft: edit, then approve, reject, re-run or cancel. */
export function TaskReview({
  id,
  status,
  kind,
  text,
  recommendation,
  instructions,
  approveLabel,
}: {
  id: string;
  status: string;
  kind: string;
  text?: string;
  recommendation?: string;
  instructions?: string | null;
  approveLabel: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(text ?? "");
  const [decision, setDecision] = useState(recommendation ?? "dismiss");
  const [note, setNote] = useState("");
  const [retryWith, setRetryWith] = useState(instructions ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; href?: string } | null>(null);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setPending(action);
    setMessage(null);
    const result = await post(`/api/workspace/agents/tasks/${id}`, { action, ...extra });
    setPending(null);
    setMessage({ ok: result.ok, text: result.payload.message ?? (result.ok ? "Done." : "Couldn't do that."), href: result.payload.href });
    router.refresh();
  }

  const editable = status === "review" && kind !== "assess_report" && text !== undefined;
  return (
    <div className="task-review">
      {editable && (
        <label className="form-field">
          <span>Draft (edit before approving)</span>
          <textarea onChange={(event) => setDraft(event.target.value)} rows={Math.min(22, Math.max(6, draft.split("\n").length + 2))} value={draft} />
        </label>
      )}
      {status === "review" && kind === "assess_report" && (
        <label className="form-field">
          <span>Decision</span>
          <select onChange={(event) => setDecision(event.target.value)} value={decision}>
            <option value="hide">Hide the content</option>
            <option value="dismiss">Dismiss the report</option>
          </select>
        </label>
      )}
      {status === "review" && (
        <label className="form-field">
          <span>Note for the record (optional)</span>
          <input maxLength={500} onChange={(event) => setNote(event.target.value)} value={note} />
        </label>
      )}
      <Message message={message} />
      {message?.href && (
        <p>
          <a href={message.href}>Open it →</a>
        </p>
      )}
      <footer className="task-actions">
        {status === "review" && (
          <>
            <button className="button-primary" disabled={pending !== null} onClick={() => act("approve", { text: editable ? draft : undefined, recommendation: kind === "assess_report" ? decision : undefined, note })} type="button">
              {pending === "approve" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
              {approveLabel}
            </button>
            <button className="button-secondary" disabled={pending !== null} onClick={() => act("reject", { note })} type="button">
              <X size={15} />
              Reject
            </button>
          </>
        )}
        {["review", "failed", "rejected"].includes(status) && (
          <span className="task-retry">
            <input aria-label="Instructions for another attempt" maxLength={1000} onChange={(event) => setRetryWith(event.target.value)} placeholder="Instructions for another attempt" value={retryWith} />
            <button className="review-mini" disabled={pending !== null} onClick={() => act("retry", { instructions: retryWith })} type="button">
              <RotateCcw size={13} />
              Run again
            </button>
          </span>
        )}
        {["queued", "review"].includes(status) && (
          <button className="review-mini" disabled={pending !== null} onClick={() => act("cancel")} type="button">
            Cancel task
          </button>
        )}
      </footer>
    </div>
  );
}
