"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { openAssistant } from "./assistant-events";

const roles = {
  clinician: {
    label: "Clinician",
    prompts: [
      "Is there evidence VR reduces procedural pain in children?",
      "How do I start VR surgical training at my hospital?",
      "Which AR systems are FDA cleared for spine surgery?",
    ],
  },
  researcher: {
    label: "Researcher",
    prompts: [
      "Recent trials of VR for stroke rehabilitation",
      "How are AR navigation systems validated for accuracy?",
      "Who is studying immersive therapy for anxiety?",
    ],
  },
  engineer: {
    label: "Engineer",
    prompts: [
      "What is still hard about AR registration accuracy?",
      "How much latency degrades fine motor precision?",
      "Talks on haptics for surgical simulation",
    ],
  },
  industry: {
    label: "Industry & business",
    prompts: [
      "What clearance path did VR pain therapies take?",
      "Which companies make surgical training platforms?",
      "New AR/VR devices the FDA authorized this year",
    ],
  },
} as const;

type Role = keyof typeof roles;

/**
 * The front door: one question box that opens Ask AVRMD, with suggestions
 * that change by role so a first visitor sees what kind of thing to ask.
 */
export function HomeAsk() {
  const [role, setRole] = useState<Role>("clinician");
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) openAssistant(query.trim());
  }

  return (
    <div className="home-ask">
      <form className="home-ask-box" onSubmit={submit}>
        <Sparkles size={20} />
        <input
          aria-label="Ask AVRMD"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What are you trying to solve?"
          value={query}
        />
        <button type="submit">
          Ask
          <ArrowRight size={17} />
        </button>
      </form>

      <div aria-label="I am a" className="home-roles" role="tablist">
        <span>I am a</span>
        {(Object.keys(roles) as Role[]).map((key) => (
          <button
            aria-selected={role === key}
            key={key}
            onClick={() => setRole(key)}
            role="tab"
            type="button"
          >
            {roles[key].label}
          </button>
        ))}
      </div>

      <div className="home-prompts">
        {roles[role].prompts.map((prompt) => (
          <button key={prompt} onClick={() => openAssistant(prompt)} type="button">
            {prompt}
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
