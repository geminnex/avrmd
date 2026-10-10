"use client";

import { useState } from "react";
import type { EmailKind } from "@/lib/email-prefs";

export function EmailPrefsForm({
  initial,
  labels,
}: {
  initial: Record<EmailKind, boolean>;
  labels: Record<EmailKind, string>;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState<EmailKind | null>(null);

  async function toggle(kind: EmailKind) {
    const on = !prefs[kind];
    setPrefs((current) => ({ ...current, [kind]: on }));
    const response = await fetch("/api/settings/email-prefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, on }),
    }).catch(() => null);
    if (!response?.ok) setPrefs((current) => ({ ...current, [kind]: !on }));
    else setSaved(kind);
  }

  return (
    <section className="email-prefs" id="email">
      <h2>Email</h2>
      {(Object.keys(labels) as EmailKind[]).map((kind) => (
        <label className="email-pref" key={kind}>
          <input checked={prefs[kind]} onChange={() => toggle(kind)} type="checkbox" />
          <span>{labels[kind]}</span>
          {saved === kind && <small>Saved</small>}
        </label>
      ))}
      <p>Account emails (confirmation, password reset) are always sent.</p>
    </section>
  );
}
