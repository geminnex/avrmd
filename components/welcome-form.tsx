"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { TagPicker, type TagOption } from "./tag-picker";

export function WelcomeForm({
  next,
  roleOptions,
  stageOptions,
  facetOptions,
  topicOptions,
}: {
  next: string;
  roleOptions: TagOption[];
  stageOptions: TagOption[];
  facetOptions: TagOption[];
  topicOptions: TagOption[];
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [canHelpWith, setCanHelpWith] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [pending, setPending] = useState<"save" | "skip" | null>(null);

  async function finish(skip: boolean) {
    setPending(skip ? "skip" : "save");
    await fetch("/api/settings/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(skip ? { skip: true } : { roles, stages, canHelpWith, topicInterests: topics }),
    }).catch(() => undefined);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="welcome-form">
      <TagPicker label="I am a" max={2} onChange={setRoles} options={roleOptions} selected={roles} />
      <TagPicker
        help="Where in the path from idea to patient you work."
        label="I work on"
        max={4}
        onChange={setStages}
        options={stageOptions}
        selected={stages}
      />
      <TagPicker
        help="Questions about these come to you (by email and on the site). Change it any time."
        label="I can help with"
        max={10}
        onChange={setCanHelpWith}
        options={facetOptions}
        selected={canHelpWith}
      />
      <TagPicker label="Clinical areas I follow" max={6} onChange={setTopics} options={topicOptions} selected={topics} />
      <div className="welcome-actions">
        <button className="button-primary" disabled={pending !== null} onClick={() => finish(false)} type="button">
          {pending === "save" ? <LoaderCircle className="spin" size={16} /> : null}
          Save and continue
          <ArrowRight size={16} />
        </button>
        <button className="sign-in-switch-button" disabled={pending !== null} onClick={() => finish(true)} type="button">
          Skip for now
        </button>
      </div>
    </div>
  );
}
