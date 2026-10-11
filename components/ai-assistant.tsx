"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, LoaderCircle, Search, Sparkles, X } from "lucide-react";
import { ask } from "@/lib/assistant/engine";
import { entityHref } from "@/lib/catalog";
import { assistantOpenEvent } from "./assistant-events";

type Source = {
  id: string;
  type: string;
  title: string;
  href: string;
  external: boolean;
  meta: string;
};
type Action = { id: string; label: string; href: string };
type Result = {
  question: string;
  mode: "ai" | "basic" | "offline";
  answer: string;
  sources: Source[];
  actions: Action[];
  followups: string[];
};

const typeLabels: Record<string, string> = {
  record: "AVRMD record",
  fda: "FDA",
  signal: "Paper / trial / news",
  talk: "Talk",
  stage: "Stage guide",
  topic: "Topic",
  website: "Website",
  question: "Member question",
  help: "Help",
};

/** Suggestions that fit the page the reader is on. */
function startersFor(path: string) {
  if (path.startsWith("/stages/")) {
    return ["What is still hard at this stage?", "Who can help at this stage?", "Which talks cover this stage?"];
  }
  if (path.startsWith("/entities/")) {
    return ["What evidence is there for this?", "What are the alternatives?", "Is this FDA authorized?"];
  }
  if (path.startsWith("/topics/")) {
    return ["What does recent research say here?", "Which products are used for this?", "Who can I ask about this?"];
  }
  if (path.startsWith("/clearances")) {
    return ["Which AR systems are cleared for spine surgery?", "What VR devices are cleared for pain?"];
  }
  return [
    "VR for pediatric procedural pain",
    "Which AR systems are FDA cleared for spine surgery?",
    "How do I start VR surgical training at my hospital?",
    "What is hard about AR registration accuracy?",
  ];
}

/** Turns "[s2]" markers into numbered links to the listed sources. */
function AnswerText({ text, sources }: { text: string; sources: Source[] }) {
  const order = new Map(sources.map((source, index) => [source.id, index + 1]));
  const parts = text.split(/(\[s\d+\])/g);
  return (
    <p className="assistant-answer">
      {parts.map((part, index) => {
        const id = part.match(/^\[(s\d+)\]$/)?.[1];
        if (!id) return <Fragment key={index}>{part}</Fragment>;
        const number = order.get(id);
        if (!number) return null;
        return (
          <a className="assistant-cite" href={`#assistant-source-${id}`} key={index}>
            {number}
          </a>
        );
      })}
    </p>
  );
}

export function AiAssistant() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setQuery(trimmed);
      setPending(true);
      try {
        const response = await fetch("/api/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed, path: pathname }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.message ?? "failed");
        // Number sources in the order the answer first cites them, and drop
        // any step that leads back to the page the reader is already on.
        const firstCited = (id: string) => {
          const at = (payload.answer as string).indexOf(`[${id}]`);
          return at === -1 ? Number.MAX_SAFE_INTEGER : at;
        };
        setResult({
          question: trimmed,
          ...payload,
          sources: [...(payload.sources as Source[])].sort((a, b) => firstCited(a.id) - firstCited(b.id)),
          actions: (payload.actions as Action[]).filter((action) => action.href !== pathname),
        });
      } catch {
        // The server is unreachable: answer from the catalog bundled in the page.
        const local = ask(trimmed);
        setResult({
          question: trimmed,
          mode: "offline",
          answer: local.lead,
          sources: local.entities.map((entity, index) => ({
            id: `s${index + 1}`,
            type: "record",
            title: entity.name,
            href: entityHref(entity),
            external: false,
            meta: entity.typeLabel,
          })),
          actions: local.links.map((link, index) => ({ id: `l${index}`, ...link })),
          followups: [],
        });
      } finally {
        setPending(false);
      }
    },
    [pathname],
  );

  useEffect(() => {
    function onOpen(event: Event) {
      setOpen(true);
      const prefill = (event as CustomEvent<string | undefined>).detail;
      if (prefill) void run(prefill);
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

  const close = () => setOpen(false);

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
        <div aria-label="Ask AVRMD" aria-modal="false" className="assistant-panel" role="dialog">
          <header className="assistant-head">
            <span>
              <Sparkles size={16} />
              Ask AVRMD
            </span>
            <button aria-label="Close" onClick={close} type="button">
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
            <button aria-label="Ask" disabled={pending} type="submit">
              {pending ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
            </button>
          </form>

          <div aria-busy={pending} aria-live="polite" className="assistant-body">
            {!result && !pending && (
              <>
                <p className="assistant-hint">
                  Ask anything about medical VR, AR or MR. Answers cite AVRMD&apos;s records, FDA
                  data, recent papers, talks and member questions.
                </p>
                <div className="assistant-starters">
                  {startersFor(pathname).map((starter) => (
                    <button key={starter} onClick={() => void run(starter)} type="button">
                      {starter}
                    </button>
                  ))}
                </div>
              </>
            )}

            {pending && <p className="assistant-hint">Looking through AVRMD…</p>}

            {result && !pending && (
              <>
                <AnswerText sources={result.sources} text={result.answer} />

                {result.actions.length > 0 && (
                  <div className="assistant-actions">
                    {result.actions.map((action) => (
                      <Link href={action.href} key={action.id} onClick={close}>
                        {action.label}
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}

                {result.sources.length > 0 && (
                  <ol className="assistant-sources">
                    {result.sources.map((source) => {
                      const inner = (
                        <>
                          <span>
                            <small>
                              {typeLabels[source.type] ?? source.type} · {source.meta}
                            </small>
                            <strong>{source.title}</strong>
                          </span>
                          <ArrowUpRight size={15} />
                        </>
                      );
                      return (
                        <li id={`assistant-source-${source.id}`} key={source.id}>
                          {source.external ? (
                            <a href={source.href} rel="noopener" target="_blank">
                              {inner}
                            </a>
                          ) : (
                            <Link href={source.href} onClick={close}>
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}

                {result.followups.length > 0 && (
                  <div className="assistant-starters assistant-followups">
                    {result.followups.map((followup) => (
                      <button key={followup} onClick={() => void run(followup)} type="button">
                        {followup}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="assistant-foot">
            {result?.mode === "ai"
              ? "Written by AI from the sources listed — check them before relying on it. Not medical advice."
              : "Answers come only from AVRMD sources — never medical advice."}{" "}
            <Link href="/about#ai" onClick={close}>
              How this works
            </Link>
          </footer>
        </div>
      )}
    </>
  );
}
