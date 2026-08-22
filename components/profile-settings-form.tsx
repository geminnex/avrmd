"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";

type ProfileSettingsFormProps = {
  initialDisplayName: string;
  initialHandle: string;
  initialBio: string;
};

export function ProfileSettingsForm({
  initialDisplayName,
  initialHandle,
  initialBio,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [state, setState] = useState<
    { status: "idle" } | { status: "loading" } | { status: "saved" } | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({ status: "error", message: payload.message ?? "Couldn't save that." });
        return;
      }

      setState({ status: "saved" });
      router.push(`/members/${payload.handle}`);
      router.refresh();
    } catch {
      setState({ status: "error", message: "Could not reach the server." });
    }
  }

  return (
    <form className="workflow-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="displayName">
        <span>Display name</span>
        <input defaultValue={initialDisplayName} id="displayName" maxLength={80} name="displayName" />
      </label>

      <label className="form-field" htmlFor="handle">
        <span>Handle</span>
        <input
          defaultValue={initialHandle}
          id="handle"
          maxLength={40}
          minLength={3}
          name="handle"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          title="Lowercase letters, numbers, and hyphens only"
        />
      </label>

      <label className="form-field" htmlFor="bio">
        <span>Bio</span>
        <textarea defaultValue={initialBio} id="bio" maxLength={280} name="bio" rows={4} />
      </label>

      {state.status === "error" && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={18} />
          <span>{state.message}</span>
        </div>
      )}

      {state.status === "saved" && (
        <div className="form-message success" role="status">
          <CheckCircle2 size={18} />
          <span>Saved.</span>
        </div>
      )}

      <button className="workflow-submit" disabled={state.status === "loading"} type="submit">
        {state.status === "loading" ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <>
            Save profile
            <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}
