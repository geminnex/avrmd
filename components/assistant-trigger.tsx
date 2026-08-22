"use client";

import { Sparkles } from "lucide-react";
import { openAssistant } from "./assistant-events";

/** Header entry point. The panel itself is mounted once in the layout. */
export function AssistantTrigger() {
  return (
    <button className="ai-button" onClick={() => openAssistant()} type="button">
      <Sparkles size={15} />
      Ask AVRMD
    </button>
  );
}
