"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import type { IntakeType } from "@/lib/workflows";

type WorkflowFormProps = {
  mode: IntakeType;
  entitySlug?: string;
  compact?: boolean;
};

const copy: Record<IntakeType, { eyebrow: string; title: string; description: string; submit: string }> = {
  submission: {
    eyebrow: "Suggest a record",
    title: "Add something missing",
    description: "An editor checks the source and replies by email. Nothing is published until it has been checked.",
    submit: "Send suggestion",
  },
  claim: {
    eyebrow: "Claim a record",
    title: "Represent your organization",
    description: "Free. An editor confirms you work there, usually through your work-domain email, and replies by email.",
    submit: "Send claim",
  },
  advertising: {
    eyebrow: "Promotion enquiry",
    title: "Ask about a placement",
    description: "An editor replies by email with what is possible and a quote. Placements are always labelled Sponsored.",
    submit: "Send enquiry",
  },
  inquiry: {
    eyebrow: "Private message",
    title: "Contact the verified representative",
    description: "A private professional message, not a clinical consultation or support channel.",
    submit: "Send message",
  },
};

const booleanFields = ["attestation", "noPhi"] as const;

export function WorkflowForm({ mode, entitySlug, compact = false }: WorkflowFormProps) {
  const formId = useId();
  const pathname = usePathname() ?? "/";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // Ask before they type: the form only sends for signed-in members.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => {
        if (!cancelled) setSignedIn(Boolean(payload.user));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; message: string; requestId: string }
    | { status: "error"; message: string; issues: string[] }
  >({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(
      formData.entries(),
    );

    for (const field of booleanFields) {
      if (form.querySelector(`[name="${field}"]`)) {
        body[field] = formData.has(field);
      }
    }

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: mode, ...body }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message: string;
        requestId?: string;
        issues?: Array<{ field: string; message: string }>;
      };

      if (!response.ok || !result.ok) {
        setState({
          status: "error",
          message: result.message,
          issues: result.issues?.map((issue) => `${issue.field}: ${issue.message}`) ?? [],
        });
        return;
      }

      setState({
        status: "success",
        message: result.message,
        requestId: result.requestId ?? "preview",
      });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the server. Nothing was sent; try again.",
        issues: [],
      });
    }
  }

  const details = copy[mode];

  if (signedIn === false) {
    return (
      <div className={`workflow-form${compact ? " compact" : ""}`}>
        <div className="workflow-form-heading">
          <span className="eyebrow">{details.eyebrow}</span>
          <h2>{details.title}</h2>
          <p>{details.description}</p>
        </div>
        <Link className="workflow-submit" href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
          Sign in or create a free account to send this
        </Link>
      </div>
    );
  }

  return (
    <form
      className={`workflow-form${compact ? " compact" : ""}`}
      onSubmit={handleSubmit}
    >
      <div className="workflow-form-heading">
        <span className="eyebrow">{details.eyebrow}</span>
        <h2>{details.title}</h2>
        <p>{details.description}</p>
      </div>

      <input name="website" tabIndex={-1} autoComplete="off" className="honeypot" />

      {mode === "submission" && (
        <>
          <div className="form-grid">
            <FormField id={`${formId}-name`} label="Record name">
              <input id={`${formId}-name`} name="name" required />
            </FormField>
            <FormField id={`${formId}-kind`} label="Record type">
              <select id={`${formId}-kind`} name="kind" defaultValue="solution">
                <option value="organization">Organization</option>
                <option value="solution">Solution</option>
                <option value="evidence">Evidence</option>
                <option value="event">Event</option>
                <option value="project">Project</option>
                <option value="group">Group</option>
              </select>
            </FormField>
          </div>
          <FormField id={`${formId}-source`} label="Official or permitted source URL">
            <input
              id={`${formId}-source`}
              name="sourceUrl"
              type="url"
              placeholder="https://"
              required
            />
          </FormField>
          <FormField id={`${formId}-rights`} label="Why AVRMD may use this metadata">
            <textarea
              id={`${formId}-rights`}
              name="rightsBasis"
              placeholder="Official metadata, open license, or permission details"
              required
            />
          </FormField>
          <FormField id={`${formId}-contact`} label="Contact email">
            <input id={`${formId}-contact`} name="contactEmail" type="email" required />
          </FormField>
          <CheckField
            name="attestation"
            label="I confirm this submission is factual, source-linked, and does not copy protected page content."
          />
        </>
      )}

      {mode === "claim" && (
        <>
          <FormField id={`${formId}-entity`} label="Organization or solution">
            <input id={`${formId}-entity`} name="entityName" required />
          </FormField>
          <div className="form-grid">
            <FormField id={`${formId}-work-email`} label="Work-domain email">
              <input id={`${formId}-work-email`} name="workEmail" type="email" required />
            </FormField>
            <FormField id={`${formId}-role`} label="Your role">
              <input id={`${formId}-role`} name="role" required />
            </FormField>
          </div>
          <FormField id={`${formId}-relationship`} label="Relationship to this record">
            <textarea
              id={`${formId}-relationship`}
              name="relationship"
              placeholder="Explain your authority to maintain official information"
              required
            />
          </FormField>
          <CheckField
            name="attestation"
            label="I understand that claiming a page does not transfer editorial or community moderation control."
          />
        </>
      )}

      {mode === "advertising" && (
        <>
          <div className="form-grid">
            <FormField id={`${formId}-org`} label="Organization">
              <input id={`${formId}-org`} name="organizationName" required />
            </FormField>
            <FormField id={`${formId}-ad-email`} label="Campaign contact">
              <input id={`${formId}-ad-email`} name="contactEmail" type="email" required />
            </FormField>
          </div>
          <FormField id={`${formId}-goal`} label="Campaign or event-announcement goal">
            <textarea id={`${formId}-goal`} name="campaignGoal" required />
          </FormField>
          <div className="form-grid">
            <FormField id={`${formId}-destination`} label="Destination URL">
              <input
                id={`${formId}-destination`}
                name="destinationUrl"
                type="url"
                placeholder="https://"
                required
              />
            </FormField>
            <FormField id={`${formId}-budget`} label="Indicative budget">
              <select id={`${formId}-budget`} name="budgetBand" defaultValue="under-2500">
                <option value="under-2500">Under $2,500</option>
                <option value="2500-10000">$2,500–$10,000</option>
                <option value="over-10000">Over $10,000</option>
              </select>
            </FormField>
          </div>
          <CheckField
            name="attestation"
            label="I accept prominent sponsorship labeling and AVRMD’s independent review."
          />
        </>
      )}

      {mode === "inquiry" && (
        <>
          <input name="entitySlug" type="hidden" value={entitySlug ?? "general"} />
          <div className="form-grid">
            <FormField id={`${formId}-sender`} label="Your name">
              <input id={`${formId}-sender`} name="senderName" required />
            </FormField>
            <FormField id={`${formId}-sender-email`} label="Professional email">
              <input
                id={`${formId}-sender-email`}
                name="senderEmail"
                type="email"
                required
              />
            </FormField>
          </div>
          <FormField id={`${formId}-sender-org`} label="Organization (optional)">
            <input id={`${formId}-sender-org`} name="organization" />
          </FormField>
          <FormField id={`${formId}-message`} label="Professional inquiry">
            <textarea
              id={`${formId}-message`}
              name="message"
              placeholder="Ask about product information, research collaboration, or an event."
              required
            />
          </FormField>
          <CheckField
            name="noPhi"
            label="This message contains no patient information, personal health information, or request for medical advice."
          />
        </>
      )}


      {state.status === "success" && (
        <div className="form-message success" role="status">
          <CheckCircle2 size={18} />
          <span>
            <strong>Sent</strong>
            {state.message}
          </span>
        </div>
      )}

      {state.status === "error" && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={18} />
          <span>
            <strong>Not sent</strong>
            {state.message}
            {state.issues.map((issue) => (
              <small key={issue}>{issue}</small>
            ))}
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
            {details.submit}
            <ArrowRight size={17} />
          </>
        )}
      </button>

      <p className="preview-disclosure">
        Preview mode validates this workflow but does not store, email, charge, or publish
        anything.
      </p>
    </form>
  );
}

function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CheckField({ name, label }: { name: string; label: string }) {
  return (
    <label className="check-field">
      <input name={name} type="checkbox" required />
      <span>{label}</span>
    </label>
  );
}
