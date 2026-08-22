"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search, Sparkles, X } from "lucide-react";
import { ask, type AssistantAnswer } from "@/lib/assistant/engine";
import { assistantOpenEvent } from "./assistant-events";

const starters = [
  "VR for chronic back pain",
  "Surgical training platforms",
  "Which headset should we buy?",
  "Evidence for pain management",
];

type Result = AssistantAnswer & { assisted?: boolean };

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const run = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // The local engine answers immediately and offline; the request below only
    // helps when the wording is unusual.
    const local = ask(trimmed);
    setResult(local);

    if (local.kind !== "none") return;

    setPending(true);
    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: trimmed }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.ok && payload.kind !== "none") {
        setResult({
          kind: payload.kind,
          lead: payload.lead,
          links: payload.links ?? [],
          topics: [],
          entities: payload.entities ?? [],
          assisted: payload.assisted,
        });
      }
    } catch {
      // Local answer already stands.
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    function onOpen(event: Event) {
      setOpen(true);
      const prefill = (event as CustomEvent<string | undefined>).detail;
      if (prefill) {
        setQuery(prefill);
        void run(prefill);
      }
    }
    window.addEventListener(assistantOpenEvent, onOpen);
    return () => window.removeEventListener(assistantOpenEvent, onOpen);
  }, [run]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      const typingElsewhere =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
      if (event.key === "/" && !typingElsewhere) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Ask AVRMD"
        className="assistant-fab"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X size={21} /> : <Sparkles size={21} />}
      </button>

      {open && (
        <div
          aria-label="Ask AVRMD"
          aria-modal="false"
          className="assistant-panel"
          ref={panelRef}
          role="dialog"
        >
          <header className="assistant-head">
            <span>
              <Sparkles size={16} />
              Ask AVRMD
            </span>
            <button aria-label="Close" onClick={() => setOpen(false)} type="button">
              <X size={17} />
            </button>
          </header>

          <form
            className="assistant-input"
            onSubmit={(event) => {
              event.preventDefault();
              void run(query);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Ask about medical XR"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What are you trying to solve?"
              ref={inputRef}
              value={query}
            />
            <button type="submit">
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="assistant-body">
            {!result && (
              <>
                <p className="assistant-hint">Try one of these:</p>
                <div className="assistant-starters">
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      onClick={() => {
                        setQuery(starter);
                        void run(starter);
                      }}
                      type="button"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </>
            )}

            {result && (
              <>
                <p className="assistant-lead">{result.lead}</p>
                {pending && <p className="assistant-hint">Checking other phrasings…</p>}

                {result.entities.map((entity) => (
                  <Link
                    className="assistant-result"
                    href={`/entities/${entity.slug}`}
                    key={entity.slug}
                    onClick={() => setOpen(false)}
                  >
                    <span>
                      <small>{entity.typeLabel}</small>
                      <strong>{entity.name}</strong>
                      <em>{entity.summary}</em>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}

                {result.links.length > 0 && (
                  <div className="assistant-links">
                    {result.links.map((link) => (
                      <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
                        {link.label}
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="assistant-foot">
            Answers come only from AVRMD records — never medical advice.{" "}
            <Link href="/about#ai" onClick={() => setOpen(false)}>
              How this works
            </Link>
          </footer>
        </div>
      )}
    </>
  );
}
