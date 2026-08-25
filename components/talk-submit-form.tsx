"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Mic, ShieldAlert } from "lucide-react";

type TagOption = { value: string; label: string };

type TalkSubmitFormProps = {
  topicOptions: TagOption[];
  stageOptions: TagOption[];
};

/**
 * A client island: /talks stays a plain server render and this checks the
 * session itself, the same trade as AccountSlot.
 */
export function TalkSubmitForm({ topicOptions, stageOptions }: TalkSubmitFormProps) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [hostLabel, setHostLabel] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => {
        if (!cancelled) setSignedIn(Boolean(payload.user));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/talks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          hostLabel: hostLabel.trim(),
          speakers: speakers
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean),
          topicSlugs: selectedTopics,
          stages: selectedStages,
        }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Couldn't add that talk.");
        return;
      }

      setTitle("");
      setUrl("");
      setSpeakers("");
      setHostLabel("");
      setSelectedTopics([]);
      setSelectedStages([]);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (signedIn === false) {
    return (
      <div className="secondary-browse">
        <div>
          <strong>Given a talk on medical XR?</strong>
          <span>Members can add their own presentations to this track.</span>
        </div>
        <a className="primary-link" href="/sign-in">
          Sign in to submit
          <ArrowRight size={15} />
        </a>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="secondary-browse">
        <div>
          <strong>Given a talk on medical XR?</strong>
          <span>Add the recording and tag it so the right people find it.</span>
        </div>
        <button className="button-secondary" onClick={() => setOpen(true)} type="button">
          <Mic size={16} />
          Add a talk
        </button>
      </div>
    );
  }

  return (
    <form className="talk-submit-form" onSubmit={handleSubmit}>
      <h3>Add a talk</h3>
      <p className="talk-submit-note">
        Link to a recording that is already public. AVRMD stores the link and its tags,
        not the video.
      </p>

      <label>
        Title
        <input
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Mixed reality guidance in spinal surgery"
          required
          value={title}
        />
      </label>

      <label>
        Recording link
        <input
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          required
          type="url"
          value={url}
        />
      </label>

      <div className="talk-submit-row">
        <label>
          Speakers
          <input
            onChange={(event) => setSpeakers(event.target.value)}
            placeholder="Comma separated"
            value={speakers}
          />
        </label>
        <label>
          Where it is hosted
          <input
            maxLength={120}
            onChange={(event) => setHostLabel(event.target.value)}
            placeholder="e.g. IEEE VR 2026"
            required
            value={hostLabel}
          />
        </label>
      </div>

      <fieldset className="talk-submit-tags">
        <legend>Clinical area</legend>
        {topicOptions.map((option) => (
          <button
            className={`chip${selectedTopics.includes(option.value) ? " chip-active" : ""}`}
            key={option.value}
            onClick={() => toggle(selectedTopics, setSelectedTopics, option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      <fieldset className="talk-submit-tags">
        <legend>Stage</legend>
        {stageOptions.map((option) => (
          <button
            className={`chip${selectedStages.includes(option.value) ? " chip-active" : ""}`}
            key={option.value}
            onClick={() => toggle(selectedStages, setSelectedStages, option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      {error && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="talk-submit-actions">
        <button className="button-primary" disabled={submitting} type="submit">
          {submitting ? <LoaderCircle className="spin" size={16} /> : <Mic size={16} />}
          {submitting ? "Adding…" : "Add talk"}
        </button>
        <button className="button-secondary" onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}
