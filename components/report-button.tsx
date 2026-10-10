"use client";

import { FormEvent, useState } from "react";
import { Flag } from "lucide-react";

const reasons: [string, string][] = [
  ["patient_information", "Contains patient or personal health information"],
  ["spam", "Spam or undisclosed promotion"],
  ["harassment", "Harassment or abuse"],
  ["misleading", "Misleading or unsafe medical claim"],
  ["copyright", "Copyright or someone else's work"],
  ["other", "Something else"],
];

/** A small "Report" link that opens an inline form. */
export function ReportButton({ type, id }: { type: "question" | "answer" | "post"; id: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resourceType: type, resourceId: id, reason: form.get("reason"), details: form.get("details") || undefined }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    if (response?.status === 401) {
      window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setState(response?.ok ? "sent" : (payload?.message ?? "Couldn't send the report."));
  }

  if (state === "sent") return <small className="report-sent">Reported — thank you.</small>;
  if (!open) {
    return (
      <button className="report-link" onClick={() => setOpen(true)} type="button">
        <Flag size={12} />
        Report
      </button>
    );
  }
  return (
    <form className="report-form" onSubmit={submit}>
      <select defaultValue="patient_information" name="reason">
        {reasons.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input maxLength={1000} name="details" placeholder="Anything an editor should know (optional)" />
      <span>
        <button className="review-mini" disabled={state === "sending"} type="submit">
          Send report
        </button>
        <button className="report-link" onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </span>
      {state !== "idle" && state !== "sending" && <small className="report-error">{state}</small>}
    </form>
  );
}
