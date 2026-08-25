"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { TagPicker, type TagOption } from "./tag-picker";

type ProfileSettingsFormProps = {
  initialDisplayName: string;
  initialHandle: string;
  initialBio: string;
  initialRoles: string[];
  initialStages: string[];
  initialCanHelpWith: string[];
  initialLookingFor: string[];
  initialTopicInterests: string[];
  initialAffiliationSlug: string;
  roleOptions: TagOption[];
  stageOptions: TagOption[];
  facetOptions: TagOption[];
  topicOptions: TagOption[];
  organizationOptions: { value: string; label: string }[];
};

export function ProfileSettingsForm({
  initialDisplayName,
  initialHandle,
  initialBio,
  initialRoles,
  initialStages,
  initialCanHelpWith,
  initialLookingFor,
  initialTopicInterests,
  initialAffiliationSlug,
  roleOptions,
  stageOptions,
  facetOptions,
  topicOptions,
  organizationOptions,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [stages, setStages] = useState(initialStages);
  const [canHelpWith, setCanHelpWith] = useState(initialCanHelpWith);
  const [lookingFor, setLookingFor] = useState(initialLookingFor);
  const [topicInterests, setTopicInterests] = useState(initialTopicInterests);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "saved" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    const form = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          roles,
          stages,
          canHelpWith,
          lookingFor,
          topicInterests,
        }),
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

      <label className="form-field" htmlFor="affiliationSlug">
        <span>Where you work</span>
        <select defaultValue={initialAffiliationSlug} id="affiliationSlug" name="affiliationSlug">
          <option value="">Not saying</option>
          {organizationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="form-hint">
          Organisations already in the catalog. Missing yours? Suggest a record first.
        </small>
      </label>

      <div className="profile-declarations">
        <div className="profile-declarations-intro">
          <h2>What you do</h2>
          <p>
            These put you in the member directory and decide which questions reach you.
            Leave them empty to stay unlisted.
          </p>
        </div>

        <TagPicker
          help="Pick the hat you wear most. At most four."
          label="Your role"
          max={4}
          onChange={setRoles}
          options={roleOptions}
          selected={roles}
        />

        <TagPicker
          help="Where in the pipeline you actually work."
          label="Your stages"
          max={8}
          onChange={setStages}
          options={stageOptions}
          selected={stages}
        />

        <TagPicker
          help="Clinical areas you care about."
          label="Clinical interests"
          max={6}
          onChange={setTopicInterests}
          options={topicOptions}
          selected={topicInterests}
        />

        <TagPicker
          help="Things you could answer for someone else. This is what the directory searches."
          label="Can help with"
          max={10}
          onChange={setCanHelpWith}
          options={facetOptions}
          selected={canHelpWith}
        />

        <TagPicker
          help="What you are stuck on yourself. Nobody minds — it is why the directory exists."
          label="Looking for help with"
          max={10}
          onChange={setLookingFor}
          options={facetOptions}
          selected={lookingFor}
        />
      </div>

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
