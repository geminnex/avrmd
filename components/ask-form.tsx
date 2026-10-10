"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BellRing, LoaderCircle, ShieldAlert } from "lucide-react";
import { TagPicker, type TagOption } from "./tag-picker";

type AskFormProps = {
  topicOptions: TagOption[];
  stageOptions: TagOption[];
  facetOptions: TagOption[];
  limits: { topicSlugs: number; stages: number; facets: number };
};

/**
 * A client island so /ask stays static: it checks the session itself, and
 * reads ?topic= / ?stage= / ?facet= so a stage or problem page can link here
 * with the tags already picked.
 */
export function AskForm({ topicOptions, stageOptions, facetOptions, limits }: AskFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pick = (key: string, options: TagOption[], max: number) =>
    searchParams
      .getAll(key)
      .filter((value) => options.some((option) => option.value === value))
      .slice(0, max);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topics, setTopics] = useState(() => pick("topic", topicOptions, limits.topicSlugs));
  const [stages, setStages] = useState(() => pick("stage", stageOptions, limits.stages));
  const [facets, setFacets] = useState(() => pick("facet", facetOptions, limits.facets));
  const [reach, setReach] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Live reach, so it is visible while tagging that facets are what put a
  // question in front of people.
  useEffect(() => {
    if (facets.length === 0) {
      setReach(0);
      return;
    }
    const params = new URLSearchParams();
    topics.forEach((value) => params.append("topic", value));
    stages.forEach((value) => params.append("stage", value));
    facets.forEach((value) => params.append("facet", value));
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/questions/preview?${params}`)
        .then((response) => response.json())
        .then((payload) => {
          if (!cancelled) setReach(typeof payload.reach === "number" ? payload.reach : null);
        })
        .catch(() => {
          if (!cancelled) setReach(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [topics, stages, facets]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          topicSlugs: topics,
          stages,
          facets,
        }),
      });

      if (response.status === 401) {
        router.push("/sign-in?next=/ask");
        return;
      }

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Couldn't post that question.");
        return;
      }

      router.push(`/questions/${payload.id}?asked=${payload.routedCount}`);
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
          <strong>Sign in to ask.</strong>
          <span>Questions are posted under your profile, so people know who to answer.</span>
        </div>
        <Link className="primary-link" href="/sign-in?next=/ask">
          Sign in
          <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const tagged = topics.length + stages.length + facets.length > 0;

  return (
    <form className="talk-submit-form ask-form" onSubmit={handleSubmit}>
      <label>
        Your question
        <input
          maxLength={200}
          minLength={12}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="How did you validate hand-tracking accuracy for suturing tasks?"
          required
          value={title}
        />
      </label>

      <label>
        Details <span className="ask-optional">optional</span>
        <textarea
          maxLength={5000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What you have tried, what you are working with, and what an answer would let you do."
          rows={6}
          value={body}
        />
      </label>

      <TagPicker
        help="These are what route the question. Pick the specific thing you are stuck on."
        label="What it is about"
        max={limits.facets}
        onChange={setFacets}
        options={facetOptions}
        selected={facets}
      />

      <TagPicker
        label="Pipeline stage"
        max={limits.stages}
        onChange={setStages}
        options={stageOptions}
        selected={stages}
      />

      <TagPicker
        label="Clinical area"
        max={limits.topicSlugs}
        onChange={setTopics}
        options={topicOptions}
        selected={topics}
      />

      <p className="ask-reach" aria-live="polite">
        <BellRing size={15} />
        {facets.length === 0 ? (
          <span>
            Add a topic tag above and members who said they can help with it are notified.
          </span>
        ) : reach === null ? (
          <span>Couldn&apos;t check who this would reach. It will still be posted.</span>
        ) : reach === 0 ? (
          <span>
            Nobody has said they can help with these tags yet. It will still be posted and
            listed for anyone browsing.
          </span>
        ) : (
          <span>
            <strong>
              {reach} {reach === 1 ? "member" : "members"}
            </strong>{" "}
            said they can help with these tags and will be notified.
          </span>
        )}
      </p>

      {error && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="talk-submit-actions">
        <button
          className="button-primary"
          disabled={submitting || !tagged || signedIn === null}
          type="submit"
        >
          {submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
          {submitting ? "Posting…" : "Post question"}
        </button>
      </div>
    </form>
  );
}
